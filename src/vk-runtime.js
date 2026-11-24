// VK Games runtime. It is active only inside the VK package: the build
// (scripts/build-vk-package.cjs) puts the pinned VK Bridge and the single
// VKWebAppInit call at the top of index.html and leaves the Init promise and
// the early Hide/Restore state in window.PptVkEarly. Everywhere else - the
// plain site, the Android build, tests - window.vkBridge is absent, connect()
// returns null and nothing here runs.
//
// What VK asks of a catalogue game and the plain site does not have:
// - the VK interface language as the default until the player picks one;
// - a pause while the VK mobile client hides the game (VKWebAppViewHide):
//   the page itself may stay "visible", so the browser event is not enough;
// - a rewarded advert, shown only when the player presses its button. The
//   game is held paused and silent until the Bridge answers;
// - a copy of the save in VK Storage, so progress follows the player to
//   another device. A different copy from elsewhere is never applied
//   silently: the player chooses in the start menu.
globalThis.PptVkRuntime = (() => {
  // VK Storage keeps 4096 characters per value, fewer for some strings;
  // chunks are plain base64, far below either limit.
  const CHUNK = 2000, MAX_CHUNKS = 40;
  const MANIFEST = 'ppt_save_m', META_KEY = 'ppt-vk-cloud-v1';
  const chunkKey = (slot, i) => 'ppt_save_' + slot + i;
  const UPLOAD_GAP = 120e3, HIDE_GAP = 15e3, WATCH_GAP = 30e3, RETRY_GAP = 600e3, AD_GUARD = 120e3, AD_RECHECK = 60e3;
  const CHAPTERS = {village: ['Деревня', 'Village'], town: ['Городок', 'Town'],
    city: ['Мегаполис', 'City'], capital: ['Столица', 'Capital']};

  // VK interface language -> game language. Russian-speaking regions get
  // Russian, every other VK language English; no hint leaves the default.
  function vkLanguage(search) {
    let value = null;
    try { value = new URLSearchParams(typeof search === 'string' ? search : '').get('vk_language'); } catch (_) {}
    if (typeof value !== 'string' || !/^[a-z]{2,3}(?:[-_][a-z0-9]+)*$/i.test(value.trim())) return null;
    const code = value.trim().slice(0, 2).toLowerCase();
    return ['ru', 'uk', 'ua', 'be', 'kz', 'kk'].includes(code) ? 'ru' : 'en';
  }
  // FNV-1a over UTF-16 code units plus the length: a change marker, not security.
  function hashText(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0') + '-' + text.length;
  }
  const toBase64 = bytes => {
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(out);
  };
  const fromBase64 = text => Uint8Array.from(atob(text), ch => ch.charCodeAt(0));
  async function pipe(bytes, Stream) {
    const stream = new Blob([bytes]).stream().pipeThrough(new Stream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Deflate where the browser has it (z:1), plain UTF-8 otherwise (z:0).
  const defaultCodec = Object.freeze({
    async encode(text) {
      const bytes = new TextEncoder().encode(text);
      if (typeof CompressionStream === 'function') {
        try { return {z: 1, data: toBase64(await pipe(bytes, CompressionStream))}; } catch (_) {}
      }
      return {z: 0, data: toBase64(bytes)};
    },
    async decode(data, z) {
      let bytes = fromBase64(data);
      if (z === 1) {
        if (typeof DecompressionStream !== 'function') throw new Error('No deflate support');
        bytes = await pipe(bytes, DecompressionStream);
      } else if (z !== 0) throw new Error('Unknown cloud save encoding');
      return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    }
  });

  function create({bridge, early = null, search = '', storage = null, now = () => Date.now(),
    timers = globalThis, codec = defaultCodec, doc = null, saveApi = globalThis.PptSave} = {}) {
    let embedded = false;
    try {
      embedded = !!bridge && typeof bridge.send === 'function' && typeof bridge.subscribe === 'function' &&
        (typeof bridge.isEmbedded !== 'function' || bridge.isEmbedded() === true);
    } catch (_) { embedded = false; }
    const language = embedded ? vkLanguage(search) : null;
    let hooks = null, viewHidden = !!(early && early.hidden), releaseView = null;
    let ad = embedded ? 'checking' : 'unavailable', adCheckedAt = 0;
    let cloud = embedded ? 'checking' : 'unavailable', slot = null, dirty = false, uploading = false;
    let lastUpload = -Infinity, timer = null, choice = null, dialog = null, menuPoll = null, watching = null;
    const call = (method, params) => {
      try { return Promise.resolve(bridge.send(method, params)); } catch (error) { return Promise.reject(error); }
    };
    const changed = () => { try { hooks && hooks.changed && hooks.changed(); } catch (_) {} };
    const ru = () => { try { return !hooks || hooks.lang() !== 'en'; } catch (_) { return true; } };

    // ---------- lifecycle ----------
    let ready = Promise.resolve(false);
    if (embedded) {
      try {
        bridge.subscribe(event => {
          const type = event && event.detail && event.detail.type;
          if (type === 'VKWebAppViewHide' || type === 'VKWebAppViewRestore') {
            viewHidden = type === 'VKWebAppViewHide';
            applyView();
          }
        });
      } catch (_) {}
      const init = early && early.init && typeof early.init.then === 'function' ? early.init : call('VKWebAppInit', {});
      ready = Promise.resolve(init).then(data => !!data && data.result === true, () => false);
      if (doc && typeof doc.addEventListener === 'function') {
        doc.addEventListener('visibilitychange', () => { if (doc.hidden) flushSoon(); });
      }
    }
    function applyView() {
      if (!hooks) return;
      if (viewHidden && !releaseView) {
        releaseView = hooks.hold('vk-view');
        try { hooks.save(); } catch (_) {}
        flushSoon();
      } else if (!viewHidden && releaseView) {
        const release = releaseView; releaseView = null; release();
      }
    }

    // ---------- rewarded advert ----------
    function checkAd() {
      if (ad === 'showing' || ad === 'unavailable') return;
      ad = 'checking'; adCheckedAt = now();
      call('VKWebAppCheckNativeAds', {ad_format: 'reward'}).then(data => {
        if (ad !== 'checking') return;
        ad = data && data.result === true ? 'ready' : 'none'; changed();
      }, () => { if (ad === 'checking') { ad = 'none'; changed(); } });
    }
    function adState() {
      if (ad === 'none' && now() - adCheckedAt >= AD_RECHECK) checkAd();
      return ad;
    }
    // Resolves true only when VK reports the advert as shown. The hold keeps
    // the shift and every sound stopped meanwhile; if the Bridge never answers
    // (a suspended client), the hold is let go after AD_GUARD, while a late
    // answer still counts.
    function showRewardAd() {
      if (ad !== 'ready' || !hooks) return Promise.resolve(false);
      ad = 'showing'; changed();
      const release = hooks.hold('vk-ad');
      let held = true;
      const free = () => { if (held) { held = false; release(); } };
      const guard = timers.setTimeout(free, AD_GUARD);
      return call('VKWebAppShowNativeAds', {ad_format: 'reward'})
        .then(data => !!data && data.result === true, () => false)
        .then(shown => {
          timers.clearTimeout(guard); free();
          ad = 'none'; checkAd();
          return shown;
        });
    }

    // ---------- progress in VK Storage ----------
    function readMeta() {
      try { const value = JSON.parse(storage.getItem(META_KEY)); if (value && typeof value === 'object') return value; } catch (_) {}
      return {};
    }
    function writeMeta(patch) {
      try { storage.setItem(META_KEY, JSON.stringify({...readMeta(), ...patch})); } catch (_) {}
    }
    function describe(raw) {
      if (typeof raw !== 'string') return null;
      try {
        const network = saveApi.loadNetwork({getItem: key => key === saveApi.networkKey ? raw : null,
          setItem() { throw new Error('read only'); }, removeItem() {}}, () => { throw new Error('no migration'); });
        if (!network || !Array.isArray(network.branches)) return null;
        const day = Math.max(1, ...network.branches.map(branch => branch && branch.state && Number.isInteger(branch.state.day) ? branch.state.day : 1));
        const chapter = network.campaign && CHAPTERS[network.campaign.chapter] ? network.campaign.chapter : null;
        return {day, chapter, finished: !!network.postgame};
      } catch (_) { return null; }
    }
    function readManifest() {
      return call('VKWebAppStorageGet', {keys: [MANIFEST]}).then(data => {
        const entry = data && Array.isArray(data.keys) ? data.keys.find(item => item && item.key === MANIFEST) : null;
        if (!entry || typeof entry.value !== 'string' || !entry.value) return null;
        const m = JSON.parse(entry.value);
        if (!m || m.v !== 1 || !['a', 'b'].includes(m.s) || !Number.isInteger(m.n) || m.n < 1 || m.n > MAX_CHUNKS ||
          typeof m.h !== 'string' || ![0, 1].includes(m.z)) throw new Error('Unknown cloud manifest');
        return m;
      });
    }
    async function download(m) {
      const keys = Array.from({length: m.n}, (_, i) => chunkKey(m.s, i));
      const data = await call('VKWebAppStorageGet', {keys});
      const values = new Map((data && Array.isArray(data.keys) ? data.keys : []).map(item => [item && item.key, item && item.value]));
      const parts = keys.map(key => values.get(key));
      if (parts.some(part => typeof part !== 'string' || !part)) throw new Error('Cloud save incomplete');
      const raw = await codec.decode(parts.join(''), m.z);
      if (hashText(raw) !== m.h) throw new Error('Cloud save damaged');
      return raw;
    }
    async function startCloud() {
      if (!storage || !saveApi) { cloud = 'unavailable'; return; }
      let m;
      try { m = await readManifest(); } catch (_) { cloud = 'unavailable'; return; }
      slot = m ? m.s : null;
      const local = hooks.readSave();
      const localHash = typeof local === 'string' ? hashText(local) : null;
      const meta = readMeta();
      if (!m || m.h === localHash || m.h === meta.h) {
        // Nothing in VK, the same save, or VK unchanged since this device last
        // synced it: this device's copy is the newer one.
        // An empty VK Storage holds nothing this device sent before.
        if (!m) writeMeta({h: null});
        else if (m.h === localHash) writeMeta({h: m.h});
        becomeReady();
        if (localHash && localHash !== (m && m.h)) { dirty = true; schedule(0); }
        return;
      }
      let raw;
      try { raw = await download(m); } catch (_) { raw = null; }
      const remote = describe(raw);
      if (!remote) {
        // A copy this game cannot read is replaced by the device's own save;
        // marking it seen lets the upload overwrite it.
        writeMeta({h: m.h});
        becomeReady();
        if (localHash) { dirty = true; schedule(0); }
        return;
      }
      choice = {raw, hash: m.h, savedAt: Number.isFinite(m.t) ? m.t : null, remote,
        local: typeof local === 'string' ? describe(local) : null};
      cloud = 'choice';
      offerChoice();
    }
    // Some game commits (a new game, story choices) write the save without the
    // game's save(); a cheap periodic comparison catches every write.
    function localChanged() {
      const local = hooks.readSave();
      return typeof local === 'string' && hashText(local) !== readMeta().h;
    }
    function becomeReady() {
      cloud = 'ready';
      if (watching === null) watching = timers.setInterval(() => {
        if (cloud === 'ready' && !uploading && !dirty && localChanged()) noteSave();
      }, WATCH_GAP);
    }
    function schedule(delay) {
      if (cloud !== 'ready' || timer !== null) return;
      timer = timers.setTimeout(() => { timer = null; upload(); }, Math.max(0, delay));
    }
    function noteSave() {
      if (cloud !== 'ready') return;
      dirty = true;
      schedule(lastUpload + UPLOAD_GAP - now());
    }
    function flushSoon() {
      if (cloud !== 'ready' || uploading) return;
      if (!dirty) { if (!localChanged()) return; dirty = true; }
      if (timer !== null) { timers.clearTimeout(timer); timer = null; }
      schedule(Math.min(Math.max(0, lastUpload + HIDE_GAP - now()), HIDE_GAP));
    }
    async function upload() {
      if (cloud !== 'ready' || uploading || !dirty) return;
      const local = hooks.readSave();
      if (typeof local !== 'string') { dirty = false; return; }
      const hash = hashText(local);
      if (hash === readMeta().h) { dirty = false; return; }
      uploading = true; dirty = false; lastUpload = now();
      try {
        // Another device may have written since: never overwrite it unasked.
        const current = await readManifest();
        if (current && current.h !== readMeta().h && current.h !== hash) {
          uploading = false; cloud = 'checking'; dirty = true;
          startCloud();
          return;
        }
        const encoded = await codec.encode(local);
        const parts = [];
        for (let i = 0; i < encoded.data.length; i += CHUNK) parts.push(encoded.data.slice(i, i + CHUNK));
        if (!parts.length || parts.length > MAX_CHUNKS) { cloud = 'too-large'; uploading = false; return; }
        // Chunks go to the slot the manifest does not point at; the manifest
        // is written last, so an interrupted upload leaves the old copy whole.
        const next = (current ? current.s : slot) === 'a' ? 'b' : 'a';
        for (let i = 0; i < parts.length; i++) {
          const result = await call('VKWebAppStorageSet', {key: chunkKey(next, i), value: parts[i]});
          if (!result || result.result !== true) throw new Error('Storage write refused');
        }
        const info = describe(local) || {};
        const manifest = JSON.stringify({v: 1, s: next, n: parts.length, h: hash, z: encoded.z, t: now(),
          day: info.day || null, ch: info.chapter || null});
        const result = await call('VKWebAppStorageSet', {key: MANIFEST, value: manifest});
        if (!result || result.result !== true) throw new Error('Storage write refused');
        slot = next; writeMeta({h: hash, t: now()});
        uploading = false;
        if (dirty) schedule(UPLOAD_GAP);
      } catch (_) {
        uploading = false; dirty = true;
        lastUpload = now() + RETRY_GAP - UPLOAD_GAP;
        schedule(RETRY_GAP);
      }
    }

    // ---------- choice between two different saves ----------
    function label(info, fallback) {
      if (!info) return fallback.charAt(0).toUpperCase() + fallback.slice(1);
      const chapter = info.chapter ? CHAPTERS[info.chapter][ru() ? 0 : 1] : '';
      const day = (ru() ? 'день ' : 'day ') + info.day;
      const text = (chapter ? chapter + ', ' : '') + day + (info.finished ? (ru() ? ', кампания пройдена' : ', story complete') : '');
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
    function when(ms) {
      if (!Number.isFinite(ms)) return '';
      try {
        return new Date(ms).toLocaleString(ru() ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
      } catch (_) { return ''; }
    }
    function offerChoice() {
      if (!choice || dialog || !doc || typeof doc.createElement !== 'function') return;
      let open = false;
      try { open = hooks.isMenuOpen() === true; } catch (_) {}
      if (!open) {
        if (menuPoll === null) menuPoll = timers.setInterval(offerChoice, 700);
        return;
      }
      if (menuPoll !== null) { timers.clearInterval(menuPoll); menuPoll = null; }
      const r = ru();
      const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
      const saved = when(choice.savedAt);
      dialog = doc.createElement('div');
      dialog.className = 'vkCloudChoice';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.innerHTML = '<div class="vkCloudCard"><h2>' + (r ? 'Прогресс в VK' : 'Progress in VK') + '</h2>' +
        '<p>' + (r ? 'В VK сохранена игра с другого устройства. С какой продолжить?' : 'VK holds a game saved on another device. Which one do you want to continue?') + '</p>' +
        '<button class="vkCloudOption" data-vk-choice="cloud"><b>' + (r ? 'Игра из VK' : 'Game from VK') + '</b><span>' +
        esc(label(choice.remote, '')) + (saved ? ' · ' + esc(saved) : '') + '</span></button>' +
        '<button class="vkCloudOption" data-vk-choice="device"><b>' + (r ? 'Игра на этом устройстве' : 'Game on this device') + '</b><span>' +
        esc(label(choice.local, r ? 'новая игра' : 'new game')) + '</span></button>' +
        '<p class="vkCloudNote">' + (r ? 'Выбранная игра заменит другую в VK.' : 'The chosen game replaces the other one in VK.') + '</p></div>';
      dialog.addEventListener('click', event => {
        const button = event.target && event.target.closest ? event.target.closest('[data-vk-choice]') : null;
        if (button) choose(button.getAttribute('data-vk-choice'));
      });
      if (!doc.getElementById('vkCloudChoiceStyle')) {
        const style = doc.createElement('style');
        style.id = 'vkCloudChoiceStyle';
        style.textContent = '.vkCloudChoice{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,10,28,.78);box-sizing:border-box}' +
          '.vkCloudCard{width:100%;max-width:420px;max-height:100%;overflow:auto;box-sizing:border-box;padding:20px 18px;border-radius:14px;background:#0b1d45;color:#fff;font:15px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.45)}' +
          '.vkCloudCard h2{margin:0 0 8px;font-size:20px}.vkCloudCard p{margin:0 0 14px}' +
          '.vkCloudOption{display:block;width:100%;min-height:56px;margin:0 0 10px;padding:10px 14px;border:2px solid #f5c542;border-radius:10px;background:#132c63;color:#fff;font:inherit;text-align:left;cursor:pointer}' +
          '.vkCloudOption b{display:block;font-size:16px}.vkCloudOption span{display:block;opacity:.85;font-size:14px}' +
          '.vkCloudOption:focus-visible{outline:3px solid #fff;outline-offset:2px}.vkCloudNote{opacity:.75;font-size:13px}';
        (doc.head || doc.body).appendChild(style);
      }
      doc.body.appendChild(dialog);
    }
    function closeDialog() {
      if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
      dialog = null;
    }
    function choose(which) {
      if (!choice) return false;
      const picked = choice; choice = null;
      if (which === 'cloud') {
        // The device copy stays under its own key; the VK copy becomes the save.
        hooks.lockSaves();
        try {
          // The device may have saved again while the choice was open: keep the newest.
          const current = hooks.readSave();
          if (typeof current === 'string') storage.setItem(saveApi.networkKey + '-before-vk', current);
        } catch (_) {}
        if (!hooks.writeSave(picked.raw)) {
          // Nothing was replaced; keep playing on this device, ask again next time.
          closeDialog(); hooks.unlockSaves(); cloud = 'unavailable';
          return false;
        }
        writeMeta({h: picked.hash});
        closeDialog();
        hooks.reload();
        return true;
      }
      try { storage.setItem(saveApi.networkKey + '-from-vk', picked.raw); } catch (_) {}
      writeMeta({h: picked.hash});
      closeDialog();
      becomeReady();
      if (typeof hooks.readSave() === 'string') { dirty = true; schedule(0); }
      return true;
    }

    // ---------- wiring ----------
    const api = Object.freeze({
      language, adState, showRewardAd, noteSave, choose,
      snapshot: () => Object.freeze({embedded, ad, cloud, viewHidden, choicePending: !!choice, dialogOpen: !!dialog})
    });
    function connect(nextHooks) {
      if (!embedded) return null;
      if (hooks) return api;
      hooks = nextHooks;
      applyView();
      ready.then(ok => {
        if (!ok) { ad = 'unavailable'; cloud = 'unavailable'; changed(); return; }
        checkAd();
        startCloud().catch(() => { cloud = 'unavailable'; });
      });
      return api;
    }
    return Object.freeze({language, connect, ready: () => ready});
  }

  const page = create({bridge: globalThis.vkBridge, early: globalThis.PptVkEarly,
    search: globalThis.location ? globalThis.location.search : '',
    storage: (() => { try { return globalThis.localStorage; } catch (_) { return null; } })(),
    doc: globalThis.document || null});
  return Object.freeze({create, vkLanguage, hashText, codec: defaultCodec, language: page.language, connect: page.connect});
})();
