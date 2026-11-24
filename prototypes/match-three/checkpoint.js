// Durable settled-state schema shared by the campaign host and the puzzle.
// No DOM, RNG, storage or messaging; invalid checkpoints fail before adoption.
(function(root){'use strict';
  const M=root.MatchThree||((typeof module!=='undefined'&&module.exports)?require('./model.js'):null);
  const {W,H,LEVELS,RETURN,SPOILED,GOLD,WRAPPED}=M,steps=[3,1,4];
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),isObj=o=>o&&typeof o==='object'&&!Array.isArray(o);
  const fail=what=>{throw new Error('Invalid match-three checkpoint: '+what);};
  function fields(o,names,label){if(!isObj(o)||Object.keys(o).length!==names.length||!names.every(k=>own(o,k)))fail(label);}
  const int=(v,min,max,label)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail(label);return v;};
  const bool=(v,label)=>{if(typeof v!=='boolean')fail(label);return v;};
  const qty=(grid,t)=>grid.reduce((n,v)=>n+(v===t),0);
  function gridOf(grid,level){
    if(!Array.isArray(grid)||grid.length!==W*H||!Array.from(grid).every(t=>Number.isInteger(t)&&(t>=0&&t<LEVELS[level].types||[RETURN,SPOILED,GOLD,WRAPPED].includes(t))))fail('grid');
    if(M.matches(grid).size||grid.slice(-W).includes(RETURN))fail('unsettled grid');
    return grid.slice();
  }
  function goals(level,step,continuation){
    if(step===null)return LEVELS[level];
    if(level===0)return {count:[3,4,continuation?.count??0][step],returns:0,spoiled:0,wrapped:0};
    if(level===1)return {count:0,returns:1,spoiled:0,wrapped:0};
    return [{count:0,returns:0,spoiled:1,wrapped:1},{count:0,returns:1,spoiled:0,wrapped:0},{count:0,returns:1,spoiled:0,wrapped:0},{count:0,returns:0,spoiled:0,wrapped:1}][step];
  }
  function won(s,g=LEVELS[s.level]){return s.normal>=g.count&&s.returns>=g.returns&&s.spoiled>=g.spoiled&&s.wrapped>=g.wrapped;}
  function validateContinuation(c){
    fields(c,['grid','pair','count','bonusType','rngSeed'],'continuation fields');
    const grid=gridOf(c.grid,0),pair=c.pair;
    if(!Array.isArray(pair)||pair.length!==2||!pair.every(k=>Number.isInteger(k)&&k>=0&&k<W*H)||!M.neighbors(pair[0]).includes(pair[1]))fail('continuation pair');
    const type=int(c.bonusType,0,LEVELS[0].types-1,'bonus type');
    if(!((grid[pair[0]]===GOLD&&grid[pair[1]]===type)||(grid[pair[1]]===GOLD&&grid[pair[0]]===type)))fail('continuation bonus');
    if(c.count!==qty(grid,type)||c.count<1)fail('continuation target count');
    return {grid,pair:pair.slice(),count:c.count,bonusType:type,rngSeed:int(c.rngSeed,0,0xffffffff,'continuation rng')};
  }
  function validate(raw){
    fields(raw,['v','level','moves','normal','returns','spoiled','wrapped','mouse','moth','grid','ended','tutorial','completedStages'],'fields');
    if(raw.v!==1)fail('version');
    const level=int(raw.level,0,LEVELS.length-1,'level'),l=LEVELS[level],grid=gridOf(raw.grid,level);
    const s={v:1,level,moves:int(raw.moves,0,l.moves,'moves'),normal:int(raw.normal,0,1000000,'normal'),returns:int(raw.returns,0,3,'returns'),spoiled:int(raw.spoiled,0,3,'spoiled'),wrapped:int(raw.wrapped,0,2,'wrapped'),mouse:int(raw.mouse,0,1,'mouse'),moth:int(raw.moth,0,1,'moth'),grid,ended:bool(raw.ended,'ended'),tutorial:null,completedStages:int(raw.completedStages,0,3,'completed stages')};
    if(raw.tutorial!==null){
      const t=raw.tutorial;fields(t,['level','step','complete','rngSeed','continuation'],'tutorial fields');
      if(t.level!==level)fail('tutorial level');const step=int(t.step,0,steps[level]-1,'tutorial step'),complete=bool(t.complete,'tutorial complete');
      const continuation=t.continuation===null?null:validateContinuation(t.continuation);
      if(!!continuation!==(level===0&&step===2))fail('continuation presence');
      s.tutorial={level,step,complete,rngSeed:int(t.rngSeed,0,0xffffffff,'tutorial rng'),continuation};
      if(s.ended||s.moves!==l.moves||s.completedStages!==level)fail('tutorial phase');
      const g=goals(level,step,continuation);
      if(complete!== (won(s,g)&&(!(level===0&&step===1)||grid.includes(GOLD))))fail('tutorial outcome');
      if(continuation&&!complete&&(s.normal!==0||s.grid.some((v,i)=>v!==continuation.grid[i])))fail('continuation changed before action');
      const usedMouse=level===2&&step===2,usedMoth=level===2&&step===3;
      if(s.mouse!==+(usedMouse&&!complete)||s.moth!==+(usedMoth&&!complete))fail('tutorial helper state');
    }else{
      const victory=won(s);
      if(s.ended!==(victory||s.moves===0)||s.completedStages!==level+(victory?1:0))fail('battle outcome');
      if(level!==2&&(s.mouse!==1||s.moth!==1))fail('unavailable helper state');
    }
    const g=goals(level,s.tutorial?.step??null,s.tutorial?.continuation??null);
    if(s.returns+qty(grid,RETURN)!==g.returns||s.spoiled+qty(grid,SPOILED)!==g.spoiled||s.wrapped+qty(grid,WRAPPED)!==g.wrapped)fail('special parcel conservation');
    return s;
  }
  function complete(raw){const s=validate(raw);return s.tutorial===null&&s.level===LEVELS.length-1&&s.ended&&won(s)&&s.completedStages===LEVELS.length;}
  function transition(previous,next){
    const n=validate(next);
    if(previous==null){if(n.level!==0||n.completedStages!==0)fail('initial stage');return n;}
    const p=validate(previous);
    if(n.level===p.level){
      if(n.completedStages<p.completedStages||n.completedStages>p.completedStages+1)fail('completed stages regression');
      if(p.completedStages>p.level&&JSON.stringify(p)!==JSON.stringify(n))fail('already won stage');
      return n;
    }
    if(n.level!==p.level+1||p.completedStages!==n.level||n.completedStages!==n.level||!p.ended||!won(p)||p.tutorial!==null||n.tutorial?.step!==0)fail('stage jump');
    return n;
  }
  const api=Object.freeze({validate,complete,transition});root.PptMatchThreeCheckpoint=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
