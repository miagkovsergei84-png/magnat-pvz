// Platform-neutral primitives only. No VK SDK, network, DOM or game-state access.
// Only the pause gate is wired into main.js; language/transition helpers remain
// unconnected until the browser-games route and an explicit driver are verified.
globalThis.PptPlatform = (() => {
  function normalizeLanguage(value) {
    if (typeof value !== 'string') return null;
    const match = /^(ru|en)(?:[-_][a-z0-9]+)*$/i.exec(value.trim());
    return match ? match[1].toLowerCase() : null;
  }
  function selectLanguage({manual, platform, device, fallback = 'en'} = {}) {
    for (const [source, value] of [['manual', manual], ['platform', platform], ['device', device]]) {
      const language = normalizeLanguage(value);
      if (language) return Object.freeze({language, source});
    }
    return Object.freeze({language: normalizeLanguage(fallback) || 'en', source: 'fallback'});
  }

  // Every owner releases only its own hold, even when reason labels coincide.
  function createPauseGate() {
    const holds = new Map();
    return Object.freeze({
      acquire(reason) {
        if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('Pause reason required');
        const token = Symbol(reason);
        holds.set(token, reason);
        return () => holds.delete(token);
      },
      snapshot() {
        return Object.freeze({paused: holds.size > 0,
          reasons: Object.freeze([...new Set(holds.values())])});
      }
    });
  }

  // A mockable boundary protocol, NOT names or semantics of any SDK callbacks.
  // Call only after results have been calculated and successfully persisted.
  // A false enabled flag is the standalone/no-SDK route and does no work.
  function createTransitionGate(pause) {
    if (!pause || typeof pause.acquire !== 'function') throw new TypeError('Pause gate required');
    const tickets = new Map();
    let active = null;
    function begin(id, {enabled = false} = {}) {
      if (typeof id !== 'string' || !id.trim()) throw new TypeError('Transition id required');
      if (tickets.has(id)) return tickets.get(id);
      if (active) return null;
      if (enabled !== true && enabled !== false) throw new TypeError('Explicit boolean required');
      let state = enabled ? 'pending' : 'skipped', opened = false, issue = null;
      const release = enabled ? pause.acquire('transition') : () => false;
      const terminal = () => ['skipped', 'closed', 'unavailable', 'cancelled'].includes(state);
      function finish(next) {
        if (terminal()) return false;
        state = next;
        release();
        if (active === ticket) active = null;
        return true;
      }
      const ticket = Object.freeze({
        snapshot: () => Object.freeze({id, state, opened, issue}),
        open() {
          if (terminal() || opened) return false;
          opened = true;
          if (state !== 'uncertain') state = 'open';
          return true;
        },
        close: () => finish('closed'),
        unavailable() {
          // Only a confirmed no-presentation response may use this path.
          return opened ? false : finish('unavailable');
        },
        cancelConfirmed() {
          // Caller must know the request was cancelled and cannot open later.
          return opened ? false : finish('cancelled');
        },
        fail(reason = 'error') {
          if (terminal() || state === 'uncertain') return false;
          if (typeof reason !== 'string' || !reason) throw new TypeError('Failure reason required');
          issue = reason;
          state = 'uncertain';
          // A timeout/error is not proof that a presentation cannot open late.
          // Keep the hold until close or a confirmed no-presentation response.
          return true;
        }
      });
      tickets.set(id, ticket);
      if (enabled) active = ticket;
      return ticket;
    }
    return Object.freeze({begin});
  }
  return Object.freeze({normalizeLanguage, selectLanguage, createPauseGate, createTransitionGate});
})();
