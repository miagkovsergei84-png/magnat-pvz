// The input is the branch-local v7 configuration. No state or random draws
// are touched here; events, cards, queue upgrades and rating remain in v7.
globalThis.PptBalance = (() => {
  const TARGET_FLOW_RATIO = 0.85;
  function flowRatio(day) {
    if (!Number.isInteger(day) || day < 1) throw new RangeError('Invalid branch day');
    // Tutorial days 1–7 remain unchanged. Fade in the reduction through day 15.
    const progress = Math.min(1, Math.max(0, (day - 7) / 8));
    return 1 - (1 - TARGET_FLOW_RATIO) * progress;
  }
  function interval(day, baseInterval) {
    if (!Number.isFinite(baseInterval) || baseInterval <= 0) throw new RangeError('Invalid arrival interval');
    return baseInterval / flowRatio(day);
  }
  function configure(day, base) {
    if (!base || typeof base !== 'object') throw new TypeError('Missing base configuration');
    return { ...base, cust: interval(day, base.cust) };
  }
  function priceFactor(day) {
    return 1 + 0.5 * (1 / flowRatio(day) - 1);
  }
  // Candidate target model: arrivals start at second 6 and the shift ends at
  // second 120. `effective` must include the shift's event, card and queue
  // modifiers. A fixed rating-flow of 1 is deliberately used as a reference.
  function dailyGoal(day, effective) {
    flowRatio(day); // Validate branch day even for unchanged tutorial goals.
    if (!effective || !Number.isFinite(effective.goal) || effective.goal < 0 ||
        !Number.isFinite(effective.cust) || effective.cust <= 0 ||
        !Number.isFinite(effective.ret) || effective.ret < 0 || effective.ret > 1 ||
        !Number.isFinite(effective.multi) || effective.multi < 0 || effective.multi > 1) {
      throw new RangeError('Invalid effective day configuration');
    }
    if (day <= 7) return effective.goal;
    const arrivals = Math.ceil(114 / effective.cust);
    const meanPickupParcels = arrivals * (1 - effective.ret) * (1 + effective.multi);
    return Math.min(effective.goal, Math.max(1, Math.floor(meanPickupParcels * 0.8)));
  }
  function supplyGoal(day, goal, available) {
    flowRatio(day);
    if (!Number.isFinite(goal) || goal < 0 ||
        !Number.isFinite(available) || available < 0)
      throw new RangeError('Invalid supply goal inputs');
    return day <= 7 ? goal : Math.min(goal, Math.max(1, Math.floor(available * 0.8)));
  }
  function volumeContractTarget(startDay, configForDay) {
    flowRatio(startDay);
    if (typeof configForDay !== 'function') throw new TypeError('Missing daily configuration provider');
    let total = 0;
    for (let day = startDay; day < startDay + 7; day++) {
      total += dailyGoal(day, configForDay(day));
    }
    return Math.round(total * 0.9);
  }
  return { TARGET_FLOW_RATIO, flowRatio, interval, configure, priceFactor, dailyGoal, supplyGoal, volumeContractTarget };
})();
