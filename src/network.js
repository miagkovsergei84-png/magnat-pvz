// Pure network rules. Branch state is supplied by the game, not shared by reference.
globalThis.PptNetwork = (() => {
  const UNLOCK_BALANCE = 15000;
  const OPEN_COST = 10000;
  const OPEN_REQUIRED_BALANCE = 15000;
  // Separate, provisional story-capital economy; the older free-play values
  // and its permanently unlocked expansion remain unchanged.
  const CAPITAL_OPEN_COST = 1500;
  const CAPITAL_OPEN_REQUIRED_BALANCE = 2500;
  const CAPITAL_PREP_SHIFTS = 3, CAPITAL_PREP_SERVED = 50, CAPITAL_PREP_STAFF = 2;
  const HIRING_DAY = 3;
  const clone = value => JSON.parse(JSON.stringify(value));
  function create(initialState) {
    const first = clone(initialState);
    const cash = first.cash;
    if (!Number.isFinite(cash)) throw new TypeError('Invalid balance');
    delete first.cash;
    const network={ version: 1, cash, expansionUnlocked: cash >= UNLOCK_BALANCE,
      activeId: 1, branches: [{ id: 1, state: first }] };
    if(typeof first.storyQueueEligible==='boolean')network.storyCampaign=true;
    return network;
  }
  function setCash(network, cash) {
    if (!Number.isFinite(cash)) throw new TypeError('Invalid balance');
    network.cash = cash;
    if (cash >= UNLOCK_BALANCE) network.expansionUnlocked = true;
  }
  function isStoryCampaign(network) {
    if(typeof network.storyCampaign==='boolean')return network.storyCampaign;
    const first=network.branches.find(branch=>branch.id===1);
    return network.branches.length===1&&typeof first?.state?.storyQueueEligible==='boolean';
  }
  function isCapitalCampaign(network) {
    return isStoryCampaign(network) && network.campaign?.chapter === 'capital' && network.campaign.status === 'active';
  }
  // The capital expansion is a separate preparation quest. Its progress uses
  // existing chapter totals, so an older save retains its completed shifts.
  function capitalExpansionQuest(network) {
    if(!isCapitalCampaign(network))return null;
    const c=network.campaign,first=network.branches.find(branch=>branch.id===1)?.state;
    const checks={
      shifts:{current:Number.isSafeInteger(c.shifts)?c.shifts:0,target:CAPITAL_PREP_SHIFTS},
      served:{current:Number.isSafeInteger(c.served)?c.served:0,target:CAPITAL_PREP_SERVED},
      staff:{current:Array.isArray(first?.staff)?first.staff.length:0,target:CAPITAL_PREP_STAFF}
    };
    for(const check of Object.values(checks))check.met=check.current>=check.target;
    return {checks,ready:Object.values(checks).every(check=>check.met)};
  }
  function expansionTerms(network) {
    if (isStoryCampaign(network)) {
      return isCapitalCampaign(network) ? {cost:CAPITAL_OPEN_COST, requiredBalance:CAPITAL_OPEN_REQUIRED_BALANCE, unlocked:capitalExpansionQuest(network).ready} : null;
    }
    return {cost:OPEN_COST, requiredBalance:OPEN_REQUIRED_BALANCE, unlocked:network.expansionUnlocked === true};
  }
  function canOpenSecond(network) {
    const terms=expansionTerms(network);
    return !!terms && terms.unlocked && Number.isFinite(network.cash) && network.cash>=terms.requiredBalance &&
      Array.isArray(network.branches) && network.branches.length===1;
  }
  function openSecond(network, freshState) {
    const terms=expansionTerms(network);
    if (!canOpenSecond(network)) return false;
    const state = clone(freshState);
    if (state.day !== 1) throw new Error('Second branch must start on day one');
    delete state.cash;
    state.startStaffSlots = 2;
    // The player takes their own shoes to either branch. In the capital the
    // new pickup point also starts with the brand recognition earned so far.
    const previous=network.branches.find(branch=>branch.id===1)?.state?.up||{};
    if(previous.shoes>0)state.up.shoes=previous.shoes;
    if(isCapitalCampaign(network)&&previous.brand>0)state.up.brand=previous.brand;
    // Starting staff must be hired by the owner, never carried over from another point.
    state.staff = [];
    state.cands = [];
    ensureSetupCandidates(state);
    const expansion={ spent: 0, started: false, legacy: false };
    if (isCapitalCampaign(network)) expansion.openingCost=terms.cost;
    network.branches.push({ id: 2, state, expansion });
    setCash(network, network.cash - terms.cost);
    return true;
  }
  function readyForFirstShift(branch) {
    if (branch.id !== 2 || branch.state.day !== 1) return true;
    const staff = branch.state.staff || [];
    return staff.some(person => person.role === 'cash') && staff.some(person => person.role === 'load');
  }
  // A status can change after a shift. Keep the irreversible marker and also
  // recognise surviving evidence in historical saves without that marker.
  function expansionStarted(branch) {
    return branch.expansion?.started === true || branch.state.day > 1 ||
      branch.runtime != null || branch.summary != null || ['play','summary','over'].includes(branch.status);
  }
  function expansionLedger(branch) {
    if (branch.id !== 2) return null;
    if (!branch.expansion) branch.expansion = { spent: 0, started: expansionStarted(branch), legacy: true };
    if (expansionStarted(branch)) branch.expansion.started = true;
    return branch.expansion;
  }
  const safeMoney = value => Number.isSafeInteger(value) && value >= 0;
  function ledgerOpeningCost(network, ledger) {
    // A damaged/legacy capital ledger with no recorded price must never fall
    // back to the larger free-play fee and mint money on cancellation.
    if (!ledger || !('openingCost' in ledger))
      return network.campaign?.chapter === 'capital' ? CAPITAL_OPEN_COST : OPEN_COST;
    // New ledgers only record the known capital price in an active or
    // completed capital campaign; malformed or injected prices are rejected.
    if (!isStoryCampaign(network) || network.campaign?.chapter !== 'capital' || ledger.openingCost !== CAPITAL_OPEN_COST)
      throw new TypeError('Invalid expansion opening cost');
    return ledger.openingCost;
  }
  function recordExpansionDebit(network, branchId, cost) {
    if (!safeMoney(cost)) throw new TypeError('Invalid expansion debit');
    const branch = network.branches.find(item => item.id === branchId);
    if (!branch || branchId !== 2 || expansionStarted(branch)) return;
    const ledger = expansionLedger(branch);
    const openingCost=ledgerOpeningCost(network,ledger);
    if (!safeMoney(ledger.spent) || !safeMoney(ledger.spent + cost) || !safeMoney(openingCost + ledger.spent + cost))
      throw new TypeError('Invalid expansion ledger');
    ledger.spent += cost;
  }
  function cancellationQuote(network) {
    const branch = network.branches.find(item => item.id === 2);
    if (!branch || expansionStarted(branch)) return null;
    const ledger = branch.expansion;
    const spent = ledger ? ledger.spent : 0;
    let openingCost;
    try { openingCost=ledgerOpeningCost(network,ledger); } catch (_) { return null; }
    const refund = openingCost + spent;
    if (!safeMoney(spent) || !safeMoney(refund) || !Number.isSafeInteger(network.cash + refund)) return null;
    return { refund, spent, legacy: ledger ? ledger.legacy : true,
      ...(network.campaign?.chapter === 'capital' ? {openingCost} : {}) };
  }
  // Call on an isolated candidate; the UI publishes it only after durable save.
  function cancelSecond(network) {
    const quote = cancellationQuote(network);
    if (!quote) return false;
    network.branches = network.branches.filter(branch => branch.id !== 2);
    network.activeId = 1;
    setCash(network, network.cash + quote.refund);
    return true;
  }
  // Preparation is branch-local, but a new network shift starts as one cohort.
  // The caller supplies game-specific card/contract requirements.
  function shiftReadiness(network, preparation) {
    const open = network.branches.filter(branch => branch.status !== 'over');
    if (!open.length) return { ready: false, reason: 'closed', branch: null };
    const running = open.find(branch => branch.status === 'play');
    if (running) return { ready: false, reason: 'running', branch: running };
    for (const branch of open) {
      if (!readyForFirstShift(branch)) return { ready: false, reason: 'staff', branch };
      const reason = preparation(branch);
      if (reason) return { ready: false, reason, branch };
    }
    return { ready: true, reason: null, branch: null, branches: open };
  }
  // A branch's local shifts and the shared trips are saved separately. Reading
  // both gives its calendar day, including trips finished in older versions.
  function calendarDay(state, network) {
    return state.day + (network?.postgame?.trips ?? 0);
  }
  // Branch 1 opens its first slot on day 3. Branch 2 keeps its two early
  // preparation slots; its additional regular slot still opens on day 11.
  function staffSlots(state, network) {
    const initial = Number.isInteger(state.startStaffSlots) && state.startStaffSlots > 0 ? state.startStaffSlots : 0;
    const room = Number.isInteger(state.up?.staffroom) && state.up.staffroom > 0 ? state.up.staffroom : 0;
    const regularDay = initial >= 2 ? 11 : HIRING_DAY;
    return initial + (calendarDay(state, network) >= regularDay ? 1 + room : 0) + (state.storyTownExtraStaffSlot === true ? 1 : 0);
  }
  function wage(person) {
    const base = 20 + 7 * (person.spd + person.acc) + 6 * (person.lvl - 1) +
      (person.trait === 'careful' ? 10 : person.trait === 'fast' ? 8 : 0);
    return Math.round(base * (person.trait === 'rookie' ? 0.6 : 1));
  }
  function canHireCandidate(person, staff) {
    return person != null &&
      !staff.some(existing => existing?.id === person.id) &&
      ['load', 'sort', 'cash'].includes(person.role) &&
      ['fast', 'careful', 'strong', 'chatty', 'rookie', 'sleepy'].includes(person.trait) &&
      [person.spd, person.acc, person.lvl].every(value => Number.isInteger(value) && value >= 1 && value <= 5);
  }
  // Replenish missing role candidates at any time before branch 2's first shift.
  // Candidate fields match v7; each is hired at the regular upfront wage.
  function ensureSetupCandidates(state) {
    if (state.day !== 1 || state.startStaffSlots !== 2) return false;
    if (!Array.isArray(state.staff) || !Array.isArray(state.cands)) throw new TypeError('Invalid staff or candidates');
    const missing = ['cash', 'load'].filter(role =>
      !state.staff.some(person => person.role === role) &&
      !state.cands.some(person => person?.role === role && canHireCandidate(person, state.staff)));
    if (!missing.length) return false;
    const ids = new Set([...state.staff, ...state.cands].map(person => person.id));
    const names = new Set([...state.staff, ...state.cands].map(person => person.n));
    let nextId = Number.isSafeInteger(state.nid) && state.nid > 0 ? state.nid : 1;
    for (const role of missing) {
      while (ids.has(nextId)) nextId++;
      let name = 0;
      while (name < 20 && names.has(name)) name++;
      // v7 has 20 names; reuse a name if an unusual save has exhausted them.
      if (name === 20) name = 0;
      const person = {id: nextId++, n: name, trait: role === 'cash' ? 'chatty' : 'careful', spd: 2, acc: 2, lvl: 1, xp: 0, role};
      state.cands.push(person); ids.add(person.id); names.add(name);
    }
    state.nid = nextId;
    return true;
  }
  function hire(network, branchId, candidateId) {
    const branch = network.branches.find(item => item.id === branchId);
    if (!branch || !Array.isArray(branch.state.staff) || !Array.isArray(branch.state.cands)) return false;
    const state = branch.state;
    const index = state.cands.findIndex(person => person?.id === candidateId);
    if (index < 0 || state.staff.length >= staffSlots(state, network)) return false;
    const person = state.cands[index];
    if (!canHireCandidate(person, state.staff)) return false;
    const cost = wage(person);
    if (!Number.isFinite(cost) || cost < 0 || network.cash < cost) return false;
    recordExpansionDebit(network, branchId, cost);
    setCash(network, network.cash - cost);
    state.staff.push(person);
    state.cands.splice(index, 1);
    return true;
  }
  return { UNLOCK_BALANCE, OPEN_COST, OPEN_REQUIRED_BALANCE, CAPITAL_OPEN_COST, CAPITAL_OPEN_REQUIRED_BALANCE, CAPITAL_PREP_SHIFTS, CAPITAL_PREP_SERVED, CAPITAL_PREP_STAFF, capitalExpansionQuest,
    HIRING_DAY, create, setCash, isStoryCampaign, isCapitalCampaign, expansionTerms, canOpenSecond, openSecond, readyForFirstShift, shiftReadiness,
    calendarDay, staffSlots, wage, ensureSetupCandidates, hire, expansionStarted, expansionLedger, recordExpansionDebit, cancellationQuote, cancelSecond };
})();
