// Synchronous adapter for the v7 closure. Does not create workers, run AI, or
// clone state: customer claims, worker.staff and parcel references stay intact.
globalThis.PptBranchRuntime = (() => {
  function create({ read, write, activeId }) {
    if (typeof read !== 'function' || typeof write !== 'function' || typeof activeId !== 'function')
      throw new TypeError('Runtime needs read, write and activeId callbacks');
    let bound = null;
    let presentation = true;

    function snapshot(branch) {
      return { S: branch.state, G: branch.runtime ?? null,
        mode: branch.status ?? 'brief', sumData: branch.summary ?? null,
        paused: branch.paused === true };
    }
    function capture(branch = bound) {
      if (!branch || branch !== bound) throw new Error('Only the bound branch can be captured');
      const current = read();
      branch.state = current.S;
      branch.runtime = current.G;
      branch.status = current.mode;
      branch.summary = current.sumData;
      branch.paused = current.paused === true;
      return branch;
    }
    function checkBranch(branch) {
      if (!branch || branch.id == null || !branch.state || typeof branch.state !== 'object')
        throw new TypeError('Invalid runtime branch');
    }
    // Call once after network initialization, and when changing the selected
    // point outside a run(). The caller owns network.activeId and UI rebuilding.
    function bind(branch) {
      checkBranch(branch);
      if (bound) capture();
      bound = branch;
      write(snapshot(branch));
      return branch;
    }
    // fn MUST be synchronous. Canvas context switching is the caller's concern.
    // finally persists even replacement S/G objects and restores the enclosing
    // branch on errors. Neither switching nor rendering resets a branch's pause.
    function run(branch, fn, { ui = true } = {}) {
      checkBranch(branch);
      if (typeof fn !== 'function') throw new TypeError('Expected synchronous callback');
      const previous = bound;
      const unboundSnapshot = previous ? null : read();
      const previousPresentation = presentation;
      if (previous) capture();
      bound = branch;
      presentation = previousPresentation && ui;
      write(snapshot(branch));
      try {
        return fn(branch);
      } finally {
        capture();
        bound = previous;
        presentation = previousPresentation;
        write(previous ? snapshot(previous) : unboundSnapshot);
      }
    }
    // Guard DOM-only entry points with this. Branch-local floats and animation
    // state still update in background; render into each branch's own canvas.
    function canPresent() {
      return presentation && (!bound || bound.id === activeId());
    }
    function tick(branches, dt, update, { paused = false } = {}) {
      if (!Number.isFinite(dt) || dt < 0) throw new TypeError('Invalid frame delta');
      if (typeof update !== 'function') throw new TypeError('Expected update callback');
      if (bound) capture();
      if (paused) return 0;
      let count = 0;
      for (const branch of branches) {
        if (branch.status !== 'play' || branch.paused || !branch.runtime) continue;
        run(branch, () => update(dt, branch));
        count++;
      }
      return count;
    }
    return { bind, capture, run, canPresent, tick, current: () => bound };
  }
  return { create };
})();
