// The house belongs to the campaign. A chapter change replaces branch.state,
// while the deed, five choices and any outstanding instalments stay with the owner.
globalThis.PptVillageHome = (() => {
  const houses = ['linden', 'bakery', 'station'];
  const styles = ['diy', 'cozy', 'office', 'barn', 'garden'];
  const price = 600, upkeep = 35, townDeposit = 500;
  function quote(cash, wages) {
    const downPayment = Math.min(200, Math.max(0, Math.floor(cash - wages - 100)));
    return {price, upkeep, downPayment, balanceAfter:cash-downPayment, debt:price-downPayment};
  }
  function purchase(house, payment) {
    if (!houses.includes(house)) throw new Error('Unknown village house');
    return {version:1, house, cleared:false, clearing:null, choices:[], shifts:0, debt:payment.debt};
  }
  function due(home) {
    if (!home?.cleared || home.choices.length === 5) return 0;
    return home.shifts >= 2 * home.choices.length + (home.firstRepairDeferred?1:0) ? home.choices.length + 1 : 0;
  }
  function repair(home, level, style) {
    if (due(home) !== level || !styles.includes(style)) throw new Error('Repair unavailable');
    home.choices.push(style);
    if(level===5)home.finishedAt=home.shifts;
  }
  function paymentDue(home, profit, cash, wages) {
    return Math.min(home?.debt || 0, Math.max(0, Math.floor(profit / 4)), Math.max(0, Math.floor(cash - 100 - wages)));
  }
  function validate(home) {
    if (home?.version !== 1 || !houses.includes(home.house) || typeof home.cleared !== 'boolean' ||
        !Number.isSafeInteger(home.shifts) || home.shifts < 0 || !Number.isSafeInteger(home.debt) || home.debt < 0 || home.debt > price ||
        !Array.isArray(home.choices) || home.choices.length > 5 || Array.from(home.choices).some(style=>!styles.includes(style)) ||
        home.choices.length > 1 + Math.floor(home.shifts/2) || (!home.cleared && (home.choices.length || home.shifts)) ||
        (home.radio !== undefined && !['speed','patience'].includes(home.radio))) throw new Error('Invalid village house');
    if(home.firstRepairDeferred!==undefined&&home.firstRepairDeferred!==true)throw new Error('Invalid first repair day');
    if(home.finishedAt!==undefined&&(!Number.isSafeInteger(home.finishedAt)||home.finishedAt<8||home.finishedAt>home.shifts||home.choices.length!==5))throw new Error('Invalid final repair day');
    globalThis.PptVillagePerks?.validateStorage(home);
    if (home.clearing != null) {
      const c=home.clearing;
      if (!Number.isInteger(c.room) || c.room<0 || c.room>2 || !Array.isArray(c.plan) || c.plan.length!==3 ||
          c.plan.some(row=>!Array.isArray(row) || (row.length!==5&&row.length!==15) || new Set(row).size!==row.length || row.some(id=>typeof id!=='string')) ||
          !Array.isArray(c.found) || c.found.length>c.plan.flat().length || c.found.some(id=>!c.plan.some(row=>row.includes(id))) || new Set(c.found).size!==c.found.length)
        throw new Error('Invalid village clearing');
    }
  }
  return Object.freeze({houses, styles, price, upkeep, townDeposit, quote, purchase, due, repair, paymentDue, validate});
})();
