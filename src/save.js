// Keep the original v7 save intact while the new format is being developed.
globalThis.PptSave = (() => {
  const legacyKey = 'ppt-save-v3';
  const key = 'ppt-save-working-v1';
  const networkKey = 'ppt-network-save-v2';
  const stagingKey = 'ppt-network-save-v2-staging';
  function validateBranch(state) {
    const dense = array => Array.isArray(array) && Array.from({length:array.length}, (_, i) => i in array).every(Boolean);
    if (!state || typeof state !== 'object' || Array.isArray(state) || !Number.isInteger(state.day) || state.day < 1)
      throw new Error('Invalid saved branch');
    for (const name of ['staff','cands','floor','big','fridge','locker','reviews','cardOpts','ctrOpts']) {
      if (name in state && !dense(state[name])) throw new Error('Invalid branch ' + name);
    }
    for (const name of ['up','perm']) {
      if (name in state && (!state[name] || typeof state[name] !== 'object' || Array.isArray(state[name]))) throw new Error('Invalid branch ' + name);
    }
    const maxLevels = {shoes:3,cart:2,scanner:1,coldspace:1,xlcart:1,mop:1,gloves:1,staffroom:2,queue:2,shelves:2,conveyor:1,returns:1,warehouse:1,locker:1,robot:1,tune:1,ai:2,brand:5,cooler:1,coffee:1,tv:1};
    if (state.up && Object.entries(state.up).some(([name,level]) => name in maxLevels && (!Number.isInteger(level) || level < 0 || level > maxLevels[name]))) throw new Error('Invalid branch upgrade');
    if ('reviews' in state && (!state.reviews.length || state.reviews.some(x => !Number.isFinite(x) || x < 1 || x > 5))) throw new Error('Invalid branch reviews');
    if ('storyQueueEligible' in state && typeof state.storyQueueEligible !== 'boolean') throw new Error('Invalid story eligibility');
    if ('storyTownExtraStaffSlot' in state && typeof state.storyTownExtraStaffSlot !== 'boolean') throw new Error('Invalid story staff slot');
    if ('staffroomNextDay' in state && (!Number.isSafeInteger(state.staffroomNextDay) || state.staffroomNextDay < 1)) throw new Error('Invalid staff-room deadline');
    if ('stock' in state && (!dense(state.stock) || state.stock.length !== 4 || state.stock.some(row => !dense(row) || row.length !== 4 || row.some(cell => !dense(cell))))) throw new Error('Invalid branch stock');
    if ('floor' in state && (state.floor.length !== 24 || state.floor.some(cell => !dense(cell)))) throw new Error('Invalid branch floor');
    if ('big' in state && (state.big.length !== 4 || state.big.some(cell => !dense(cell)))) throw new Error('Invalid branch big-parcel storage');
    if ('fridge' in state && ![3,6].includes(state.fridge.length)) throw new Error('Invalid branch fridge');
    if ('locker' in state && state.locker.length !== 6) throw new Error('Invalid branch locker');
    if ('autoLocker' in state) {
      const locker=state.autoLocker;
      if (!locker || typeof locker!=='object' || locker.version!==1 || state.up?.locker!==1 ||
          !Number.isSafeInteger(locker.nextId) || locker.nextId<1 || typeof locker.closing!=='boolean' ||
          !dense(locker.slots) || locker.slots.length!==6) throw new Error('Invalid automatic locker');
      const ids=new Set(),parcels=new Set();
      for(const order of locker.slots)if(order!==null){
        const p=order?.parcel;
        if(!order || !Number.isSafeInteger(order.id) || order.id<1 || order.id>=locker.nextId || ids.has(order.id) ||
           !['queued','approaching','loading','ready','claimed'].includes(order.status) ||
           !p || typeof p!=='object' || Array.isArray(p) || parcels.has(p) || !Number.isInteger(p.c) || p.c<0 || p.c>3 ||
           !Number.isInteger(p.s) || p.s<0 || p.s>3 || p.r!==false || p.f!==false || p.cold!=null || !Number.isFinite(p.ready))
          throw new Error('Invalid automatic locker order');
        ids.add(order.id);parcels.add(p);
      }
      const other=[...(state.stock||[]).flat(2),...(state.floor||[]).flat(),...(state.big||[]).flat(),...(state.fridge||[]),...(state.locker||[])];
      if(other.some(parcel=>parcel&&parcels.has(parcel)))throw new Error('Locker order also in storage');
    }
    const validPerson = person => person && typeof person === 'object' && !Array.isArray(person) &&
      Number.isSafeInteger(person.id) && person.id > 0 && Number.isInteger(person.n) && person.n >= 0 && person.n < 20 &&
      ['load','sort','cash'].includes(person.role) && ['fast','careful','strong','chatty','rookie','sleepy'].includes(person.trait) &&
      ['spd','acc','lvl'].every(field => Number.isInteger(person[field]) && person[field] >= 1 && person[field] <= 5) &&
      Number.isFinite(person.xp) && person.xp >= 0;
    if ('staff' in state && state.staff.some(person => !validPerson(person))) throw new Error('Invalid branch staff');
    if ('cands' in state && state.cands.some(person => !validPerson(person))) throw new Error('Invalid branch candidates');
    return state;
  }
  function parse(raw) {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !Number.isInteger(value.day) || value.day < 1 ||
        typeof value.cash !== 'number' || !Number.isFinite(value.cash)) {
      throw new Error('Invalid pickup point save');
    }
    return validateBranch(value);
  }
  function write(storage, state) {
    const raw = JSON.stringify(state);
    parse(raw);
    storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) throw new Error('Save verification failed');
  }
  function load(storage) {
    const current = storage.getItem(key);
    if (current !== null) return parse(current);
    const legacy = storage.getItem(legacyKey);
    if (legacy === null) return null;
    const state = parse(legacy);
    write(storage, state);
    return state;
  }
  // Preserve shared references (including customer/worker cycles) in live shifts.
  function encodeGraph(root) {
    const seen = new Map(), nodes = [];
    function encode(value) {
      if (value === undefined) return ['u'];
      if (value === null || typeof value === 'string' || typeof value === 'boolean') return ['v', value];
      if (typeof value === 'number' && Number.isFinite(value)) return ['v', value];
      if (typeof value !== 'object') throw new TypeError('Unsupported saved value');
      if (seen.has(value)) return ['r', seen.get(value)];
      const id = nodes.length;
      seen.set(value, id);
      const array = Array.isArray(value);
      if (!array && Object.prototype.toString.call(value) !== '[object Object]')
        throw new TypeError('Unsupported saved object');
      const node = { type: array ? 'array' : 'object', entries: [] };
      nodes.push(node);
      for (const key of Object.keys(value)) node.entries.push([key, encode(value[key])]);
      if (array) node.length = value.length;
      return ['r', id];
    }
    return { format: 2, root: encode(root), nodes };
  }
  function decodeGraph(graph) {
    if (!graph || graph.format !== 2 || !Array.isArray(graph.nodes) || graph.nodes.length > 200000)
      throw new Error('Invalid save graph');
    const objects = graph.nodes.map(node => {
      if (!node || !Array.isArray(node.entries)) throw new Error('Invalid save node');
      if (node.type === 'object') return {};
      if (node.type === 'array' && Number.isSafeInteger(node.length) && node.length >= 0 && node.length <= 200000) return new Array(node.length);
      throw new Error('Invalid save node type');
    });
    function decode(token) {
      if (!Array.isArray(token)) throw new Error('Invalid saved reference');
      if (token.length === 1 && token[0] === 'u') return undefined;
      if (token.length === 2 && token[0] === 'r' && Number.isInteger(token[1]) && token[1] >= 0 && token[1] < objects.length) return objects[token[1]];
      if (token.length === 2 && token[0] === 'v' && (token[1] === null || typeof token[1] === 'string' || typeof token[1] === 'boolean' || (typeof token[1] === 'number' && Number.isFinite(token[1])))) return token[1];
      throw new Error('Invalid saved reference');
    }
    graph.nodes.forEach((node, i) => {
      const used = new Set();
      for (const entry of node.entries) {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || used.has(entry[0])) throw new Error('Invalid saved property');
        const name = entry[0];
        if (node.type === 'array' && (!/^(0|[1-9]\d*)$/.test(name) || Number(name) >= node.length)) throw new Error('Invalid array index');
        used.add(name);
        Object.defineProperty(objects[i], name, { value: decode(entry[1]), writable: true, enumerable: true, configurable: true });
      }
    });
    return decode(graph.root);
  }
  function validateNetwork(value) {
    if (!value || typeof value !== 'object' || value.version !== 1 || !Number.isFinite(value.cash) || !Array.isArray(value.branches) || value.branches.length < 1 || value.branches.length > 2)
      throw new Error('Invalid network save');
    if ('villageHome' in value) PptVillageHome.validate(value.villageHome);
    if ('townHome' in value) {
      if(!globalThis.PptTownRenovation||value.campaign?.chapter!=='town')throw new Error('Town renovation outside town');
      PptTownRenovation.validate(value.townHome);
      if(value.townHome.startShift>value.campaign.shifts||value.townHome.choices.length>value.campaign.shifts-value.townHome.startShift||value.townHome.finishedAt>value.campaign.shifts)throw new Error('Invalid town repair dates');
      if(value.townHome.arcade&&value.storyPresentation?.type!=='townBasement')throw new Error('Arcade checkpoint outside basement');
    }
    if ('cityCourier' in value) {
      const task=value.cityCourier;
      if(value.campaign?.chapter!=='city'||!task||typeof task!=='object'||Array.isArray(task)||typeof task.complete!=='boolean'||
        Object.keys(task).some(k=>!['complete','checkpoint'].includes(k))||
        (task.complete&&Object.hasOwn(task,'checkpoint'))||(!task.complete&&!Object.hasOwn(task,'checkpoint')))
        throw new Error('Invalid city delivery progress');
      if(!task.complete&&task.checkpoint!==null){
        if(!globalThis.CourierCheckpoint)throw new Error('City delivery rules unavailable');
        CourierCheckpoint.validate(task.checkpoint);
      }
    }
    if ('cityMatchThree' in value) {
      const task=value.cityMatchThree;
      if(value.campaign?.chapter!=='city'||value.campaign.status!=='complete'||!task||typeof task!=='object'||Array.isArray(task)||typeof task.complete!=='boolean'||
        Object.keys(task).some(k=>!['complete','checkpoint'].includes(k))||
        (task.complete&&Object.hasOwn(task,'checkpoint'))||(!task.complete&&!Object.hasOwn(task,'checkpoint')))
        throw new Error('Invalid city sorting progress');
      if(!task.complete&&task.checkpoint!==null){
        if(!globalThis.PptMatchThreeCheckpoint)throw new Error('City sorting rules unavailable');
        PptMatchThreeCheckpoint.validate(task.checkpoint);
      }
    }
    if ('villageOfferDay' in value && (!Number.isSafeInteger(value.villageOfferDay)||value.villageOfferDay<5)) throw new Error('Invalid house offer date');
    if ('villageRentFromDay' in value && (!Number.isSafeInteger(value.villageRentFromDay)||value.villageRentFromDay<6)) throw new Error('Invalid rent increase date');
    if ('villageRenovation' in value && value.villageRenovation!==1) throw new Error('Invalid village renovation version');
    if ('villageLegacyDeparture' in value && value.villageLegacyDeparture!==true) throw new Error('Invalid legacy departure');
    for (const field of ['guideSeen','guidePending']) {
      if (field in value && (!Array.isArray(value[field]) || value[field].length > 100 || value[field].some(key => typeof key !== 'string' || !/^(?:upgrade:[a-z0-9]+:[1-5]|event:[a-z0-9]+|intro:(?:contract|card|shop))$/.test(key)) || new Set(value[field]).size !== value[field].length))
        throw new Error('Invalid narrator guide state');
    }
    if ('manualPaused' in value && typeof value.manualPaused !== 'boolean') throw new Error('Invalid network manual pause');
    if ('storyCampaign' in value && typeof value.storyCampaign !== 'boolean') throw new Error('Invalid story campaign flag');
    // Interludes already shown in this campaign; optional in older saves.
    if ('storySeen' in value && (!value.campaign || !Array.isArray(value.storySeen) || value.storySeen.length > 100 || !globalThis.PptStoryContent ||
        value.storySeen.some(id => typeof id !== 'string' || !PptStoryContent.ids.includes(id)) || new Set(value.storySeen).size !== value.storySeen.length))
      throw new Error('Invalid story history');
    if ('journeyGuide' in value && !['map','map_view','shop','team','return_shop','shop_intro','earn','done'].includes(value.journeyGuide)) throw new Error('Invalid journey tutorial state');
    if ('campaign' in value) {
      if (!globalThis.PptCampaign) throw new Error('Campaign rules unavailable');
      PptCampaign.assertCampaign(value.campaign);
      if (!value.campaignCheckpoint) throw new Error('Missing campaign checkpoint');
      validateBranch(value.campaignCheckpoint);
    }
    // The after-story section appears only once the capital finale is done.
    if ('postgame' in value) {
      if (!globalThis.PptPostgame) throw new Error('Postgame rules unavailable');
      PptPostgame.assertPostgame(value.postgame, value.campaign);
    }
    // An away shift lives in memory only and must never reach the storage.
    if ('away' in value) throw new Error('Away shift cannot be saved');
    if ('storyPresentation' in value) {
      const p=value.storyPresentation;
      if (!value.campaign || !p || typeof p!=='object' || Array.isArray(p) || !['scene','choose','retryNotice','finished','villageInstall','townBasement','townRepair','townInstall','cityCourier','cityMatchThree'].includes(p.type)) throw new Error('Invalid story presentation');
      if(p.type==='cityCourier'&&(value.campaign.chapter!=='city'||value.campaign.status!=='active'||!value.cityCourier||value.cityCourier.complete||
        value.campaign.shifts<1||value.activeId!==1||value.branches.some(branch=>branch.status==='play')))
        throw new Error('Invalid city delivery presentation');
      if(p.type==='scene'&&['city_courier_intro','city_courier_done'].includes(p.id)&&(value.campaign.chapter!=='city'||value.campaign.status!=='active'||
        !value.cityCourier||value.cityCourier.complete!==(p.id==='city_courier_done')))
        throw new Error('Invalid city delivery scene');
      if(p.type==='cityMatchThree'&&(value.campaign.chapter!=='city'||value.campaign.status!=='complete'||!value.cityMatchThree||value.cityMatchThree.complete||
        value.activeId!==1||value.branches.some(branch=>branch.status==='play')))
        throw new Error('Invalid city sorting presentation');
      if(p.type==='scene'&&['city_sorting_intro','city_sorting_done'].includes(p.id)&&(value.campaign.chapter!=='city'||value.campaign.status!=='complete'||
        !value.cityMatchThree||value.cityMatchThree.complete!==(p.id==='city_sorting_done')))
        throw new Error('Invalid city sorting scene');
      // Legacy saves without a sorting record may still carry a city choose
      // screen; the runtime migrates it to the finale. New incomplete sorting
      // saves cannot present an employee choice before the required task.
      if(p.type==='choose'&&value.campaign.chapter==='city'&&value.campaign.status==='complete'&&value.cityMatchThree&&!value.cityMatchThree.complete)
        throw new Error('City sorting is not complete');
      if(p.type==='villageInstall'&&(value.campaign.chapter!=='village'||!value.villageHome?.cleared||!Number.isInteger(p.level)||
        p.level<1||p.level>5||p.level!==value.villageHome.choices.length))throw new Error('Invalid village installation');
      if(['townBasement','townRepair','townInstall'].includes(p.type)){
        if(value.campaign.chapter!=='town'||value.campaign.status!=='active'||!value.townHome)throw new Error('Invalid town presentation');
        const work=PptTownRenovation.due(value.townHome,value.campaign.shifts);
        if(p.type==='townBasement'&&(work?.kind!=='basement'||work.episode!==p.episode)||p.type==='townRepair'&&(work?.kind!=='repair'||work.level!==p.level)||p.type==='townInstall'&&(p.level!==value.townHome.choices.length||!Number.isInteger(p.level)||p.level<1||p.level>5))throw new Error('Invalid town work');
      }
      if (p.type==='scene' && (!globalThis.PptStoryContent || !PptStoryContent.ids.includes(p.id) || !Number.isSafeInteger(p.step) || p.step<0 || p.step>=PptStoryContent.scene(p.id,'ru').length)) throw new Error('Invalid story scene');
      if (p.type==='retryNotice' && ['penalty','support','clearedDebt'].some(key=>!Number.isFinite(p[key])||p[key]<0)) throw new Error('Invalid retry notice');
    }
    const ids = new Set();
    for (const branch of value.branches) {
      if (!branch || ![1,2].includes(branch.id) || ids.has(branch.id)) throw new Error('Invalid saved branch');
      validateBranch(branch.state);
      if (branch.expansion !== undefined) {
        const ledger = branch.expansion;
        if (branch.id !== 2 || !ledger || typeof ledger !== 'object' || Array.isArray(ledger) ||
            !Number.isSafeInteger(ledger.spent) || ledger.spent < 0 ||
            !Number.isSafeInteger(10000 + ledger.spent) ||
            typeof ledger.started !== 'boolean' || typeof ledger.legacy !== 'boolean') throw new Error('Invalid expansion ledger');
        if ('openingCost' in ledger && (!globalThis.PptNetwork || value.campaign?.chapter !== 'capital' ||
            value.storyCampaign !== true || ledger.openingCost !== PptNetwork.CAPITAL_OPEN_COST))
          throw new Error('Invalid expansion opening cost');
      }
      if (branch.status !== undefined && !['menu','brief','play','summary','shop','team','over'].includes(branch.status)) throw new Error('Invalid branch status');
      if (branch.paused !== undefined && typeof branch.paused !== 'boolean') throw new Error('Invalid branch pause');
      if (branch.status === 'play') {
        const g = branch.runtime;
        if (!g || typeof g !== 'object' || !Number.isFinite(g.clock) || !Number.isFinite(g.time) || !g.cfg || !g.mod || !g.p || !Array.isArray(g.p.hands) || !g.st ||
            !['plan','q','leaving','mess','floats','workers','win','lockerQ'].every(k => Array.isArray(g[k])) ||
            g.q.some(line => !Array.isArray(line)) || g.workers.some(worker => !worker || typeof worker !== 'object' || !Array.isArray(worker.carry))) throw new Error('Invalid running shift');
        if ('campaignServed' in g && (!Number.isSafeInteger(g.campaignServed) || g.campaignServed<0)) throw new Error('Invalid campaign customers');
        if ('autoLocker' in g) {
          const locker=branch.state.autoLocker,run=g.autoLocker;
          if(!locker || !run || typeof run!=='object' || Array.isArray(run))throw new Error('Invalid active locker');
          for(const [name,statuses] of [['courier',['approaching','loading']],['customer',['claimed']]]){
            const actor=run[name],matching=locker.slots.filter(order=>order&&statuses.includes(order.status));
            if(actor===null){if(matching.length)throw new Error('Missing locker actor');continue;}
            if(!actor || !Number.isInteger(actor.slot) || actor.slot<0 || actor.slot>=6 || !Number.isSafeInteger(actor.id) ||
               !Number.isFinite(actor.elapsed) || actor.elapsed<0 || actor.elapsed>(name==='courier'?4:3.5) || matching.length!==1 ||
               locker.slots[actor.slot]!==matching[0] || matching[0].id!==actor.id)throw new Error('Invalid locker actor');
          }
          for(const [name,active,limit] of [['courierExit','courier',1.4],['customerExit','customer',1.2]]){
            const actor=run[name];if(actor==null)continue;
            if(!actor||typeof actor!=='object'||Array.isArray(actor)||run[active]||
               !Number.isFinite(actor.elapsed)||actor.elapsed<0||actor.elapsed>=limit)throw new Error('Invalid exiting locker actor');
            if(name==='customerExit'){
              const p=actor.parcel;
              if(typeof actor.shirt!=='string'||!p||typeof p!=='object'||Array.isArray(p)||
                 !Number.isInteger(p.c)||p.c<0||p.c>3||!Number.isInteger(p.s)||p.s<0||p.s>3||
                 p.r!==false||p.f!==false||p.cold!=null||!Number.isFinite(p.ready))throw new Error('Invalid exiting locker parcel');
            }
          }
          const reserved=new Set(locker.slots.filter(Boolean).map(order=>order.parcel));
          const movable=[...g.p.hands,...(g.truck?.cargo||[]),...g.workers.flatMap(worker=>worker.carry)];
          if(movable.some(parcel=>reserved.has(parcel)))throw new Error('Locker order also in transit');
          const exiting=run.customerExit?.parcel;
          if(exiting&&(reserved.has(exiting)||movable.includes(exiting)||
              [...(branch.state.stock||[]).flat(2),...(branch.state.floor||[]).flat(),...(branch.state.big||[]).flat(),...(branch.state.fridge||[]),...(branch.state.locker||[])].includes(exiting)))
            throw new Error('Exiting locker parcel also in storage');
        } else if(branch.state.autoLocker?.slots.some(order=>order&&['approaching','loading','claimed'].includes(order.status)))throw new Error('Missing active locker');
        if ('storyLive' in g && (!g.storyLive || typeof g.storyLive !== 'object' || Array.isArray(g.storyLive) || branch.id!==1 || branch.state.day!==2 || branch.state.storyQueueEligible!==true ||
            !Number.isFinite(g.storyLive.elapsed) || g.storyLive.elapsed<0 || g.storyLive.elapsed>5 || !Number.isFinite(g.storyLive.x) || !Number.isFinite(g.storyLive.y))) throw new Error('Invalid story scene');
      }
      else if(branch.state.autoLocker?.slots.some(order=>order&&['approaching','loading','claimed'].includes(order.status)))throw new Error('Unfinished locker actor outside shift');
      if (['summary','over'].includes(branch.status) && (!branch.summary || !branch.summary.st)) throw new Error('Invalid shift summary');
      if (branch.summary && 'calendarDay' in branch.summary && (!Number.isSafeInteger(branch.summary.calendarDay) || branch.summary.calendarDay < 1)) throw new Error('Invalid summary date');
      if (branch.summary && 'storyQueueStep' in branch.summary && ![0,1,2].includes(branch.summary.storyQueueStep)) throw new Error('Invalid story scene step');
      ids.add(branch.id);
    }
    if (!ids.has(1) || !ids.has(value.activeId) || typeof value.expansionUnlocked !== 'boolean') throw new Error('Invalid network metadata');
    if(value.townHome){const branch=value.branches.find(b=>b.id===1),s=branch.state,g=branch.runtime,stored=new Set([...value.townHome.buffer,...value.townHome.returns,...value.townHome.dock]);
      const elsewhere=[...(s.stock||[]).flat(2),...(s.floor||[]).flat(),...(s.big||[]).flat(),...(s.fridge||[]),...(s.locker||[]),...(g?.p?.hands||[]),...(g?.workers||[]).flatMap(w=>w.carry||[]),...(g?.truck?.cargo||[]),...(g?.townNextCargo||[])];
      if(elsewhere.some(p=>stored.has(p)))throw new Error('Town parcel also in other storage');
    }
    if (value.totals !== undefined && (!value.totals || typeof value.totals !== 'object' ||
        !Number.isSafeInteger(value.totals.days) || value.totals.days < 0 ||
        !Number.isSafeInteger(value.totals.served) || value.totals.served < 0 ||
        !Number.isFinite(value.totals.revenue) || value.totals.revenue < 0)) throw new Error('Invalid network totals');
    // Branch-local objects must never alias another branch, even deep in G.
    const owner = new WeakMap();
    for (const branch of value.branches) {
      const pending = [branch.state, branch.runtime, branch.summary];
      while (pending.length) {
        const object = pending.pop();
        if (!object || typeof object !== 'object') continue;
        const previous = owner.get(object);
        if (previous !== undefined) {
          if (previous !== branch.id) throw new Error('Shared branch state');
          continue;
        }
        owner.set(object, branch.id);
        for (const key of Object.keys(object)) pending.push(object[key]);
      }
    }
    return value;
  }
  function writeNetwork(storage, network) {
    validateNetwork(network);
    const raw = JSON.stringify(encodeGraph(network));
    validateNetwork(decodeGraph(JSON.parse(raw)));
    storage.setItem(stagingKey, raw);
    if (storage.getItem(stagingKey) !== raw) throw new Error('Staged save verification failed');
    const previous = storage.getItem(networkKey);
    try {
      storage.setItem(networkKey, raw);
      if (storage.getItem(networkKey) !== raw) throw new Error('Save verification failed');
    } catch (error) {
      // Some adapters throw after writing. A verified primary is committed.
      let committed = false;
      try { committed = storage.getItem(networkKey) === raw; } catch (_) {}
      if (!committed) {
        try {
          if (storage.getItem(networkKey) !== previous) {
            if (previous === null) storage.removeItem(networkKey); else storage.setItem(networkKey, previous);
          }
          if (storage.getItem(networkKey) !== previous) throw new Error('Rollback verification failed');
        } catch (_) { error.saveUncertain = true; }
        throw error;
      }
    }
    // Cleanup failure cannot undo a verified commit. Loading uses primary only.
    try { storage.removeItem(stagingKey); } catch (_) {}
  }
  function loadNetwork(storage, migrate) {
    const raw = storage.getItem(networkKey);
    if (raw !== null) return validateNetwork(decodeGraph(JSON.parse(raw)));
    const old = storage.getItem(key) ?? storage.getItem(legacyKey);
    if (old === null) return null;
    const migrated = validateNetwork(migrate(parse(old)));
    writeNetwork(storage, migrated);
    return migrated;
  }
  // A save that cannot be read is moved under its own keys, never deleted.
  // Every copy is written and verified before any original is removed, so a
  // failure leaves the storage exactly as it was.
  const unreadableSuffix = '-unreadable';
  function setAside(storage) {
    const found = [networkKey, stagingKey, key, legacyKey].map(name => [name, storage.getItem(name)]).filter(([, raw]) => raw !== null);
    for (const [name, raw] of found) {
      storage.setItem(name + unreadableSuffix, raw);
      if (storage.getItem(name + unreadableSuffix) !== raw) throw new Error('Set-aside verification failed');
    }
    for (const [name] of found) storage.removeItem(name);
    return found.map(([name]) => name);
  }
  return { key, legacyKey, networkKey, stagingKey, unreadableSuffix, load, write, encodeGraph, decodeGraph, loadNetwork, writeNetwork, setAside };
})();
