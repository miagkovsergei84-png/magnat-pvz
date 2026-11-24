// Pure weekly contract rules. Callers own the branch state, balance-derived
// volume target, localized text, and application of earned rewards.
globalThis.PptContracts = (() => {
  const ids=['volume','service','accuracy','stars','fragile'];

  function spec(id,day,volumeTargetForWeek) {
    return id==='volume'?{target:volumeTargetForWeek(day),cash:30*day}
      :id==='service'?{target:5}
      :id==='fragile'?{target:5}
      :id==='accuracy'?{target:3}
      :{target:15,cash:40*day};
  }

  function update(contract,stats,nStars,day) {
    if(!contract||contract.state!=='active')return null;
    const progress=contract.prog+(contract.id==='volume'?stats.served
      :contract.id==='fragile'?(stats.fragileServed||0)
      :contract.id==='service'?stats.angry
      :contract.id==='accuracy'?stats.mistakes+stats.broken+stats.spoiled:nStars);
    const high=contract.id==='volume'||contract.id==='stars'||contract.id==='fragile';
    let outcome=null;
    if(high&&progress>=contract.target)outcome='done';
    else if(!high&&progress>contract.target)outcome='fail';
    else if(day>=contract.end)outcome=high?'fail':'done';
    const reward=outcome==='done'?(contract.id==='service'?'pay'
      :contract.id==='accuracy'?'pat':contract.id==='fragile'?'gloves':'cash'):null;
    return {progress,outcome,reward};
  }

  return {ids,spec,update};
})();
