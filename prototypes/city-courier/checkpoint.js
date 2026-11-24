'use strict';
(function(root){
  const node=typeof module!=='undefined'&&module.exports;
  const M=node?require('./model.js'):root.CourierMap,R=node?require('./runner-model.js'):root.CourierRunner;
  const dirs=['left','right','jump','slide'],kinds=Object.keys(R.KINDS);
  const fields=['seed','status','distance','elapsed','lane','xLane','pose','poseAt','lives','shieldUntil','active','handoff','noticeKind','noticeUntil','lastHit','actions'];
  const edges=M.neighbors.flatMap((next,i)=>next.filter(j=>i<j).map(j=>M.key(i,j)));
  const isInt=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
  const number=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
  const point=value=>isInt(value,0,M.count-1);
  const fail=()=>{throw new Error('Invalid courier checkpoint');};
  function record(value,keys){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||!keys.every(k=>Object.hasOwn(value,k)))fail();
  }
  let knownMap=null,lastProgram=null;
  function mapKey(map){
    record(map,['size','depot','stops','roads','target','optimal']);
    if(map.size!==M.size||!point(map.depot)||!Array.isArray(map.stops)||map.stops.length!==4||!map.stops.every(point)||new Set([map.depot,...map.stops]).size!==5||!isInt(map.optimal,8,300)||map.target!==map.optimal+4)fail();
    record(map.roads,edges);
    const codes=edges.map(e=>map.roads[e]);
    if(codes.some(w=>![0,1,3].includes(w))||codes.filter(w=>w===0).length!==5||codes.filter(w=>w===3).length!==7)fail();
    const key=[map.depot,...map.stops,map.optimal,codes.join('')].join(':');
    if(knownMap!==key){if(M.shortest(map)?.cost!==map.optimal)fail();knownMap=key;}
    return key;
  }
  function seeded(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
  function build(map,route,seed,key=mapKey(map)){
    if(!isInt(seed,0,0xffffffff))fail();
    const signature=key+'|'+route.join(',')+'|'+seed;
    if(lastProgram?.signature===signature)return lastProgram.program;
    const program=R.compile(map,route,seeded(seed));
    lastProgram={signature,program};
    return program;
  }
  function progress(program,distance,pending){
    let streetIndex=0,completedCost=0;const delivered=[];
    for(const s of program.streets){
      if(s.end>distance)break;
      streetIndex++;completedCost+=s.cost;
      if(s.stop!==null&&!(pending&&s.end===distance))delivered.push(s.stop);
    }
    return {streetIndex,completedCost,delivered};
  }
  function validate(state){
    record(state,['v','map','route','runner']);
    if(state.v!==1)fail();
    const {map,route,runner:p}=state,key=mapKey(map);
    if(!Array.isArray(route)||!isInt(route.length,1,R.MAX_STREETS+1)||!route.every(point)||route[0]!==map.depot)fail();
    const visited=new Set();
    for(let i=1;i<route.length;i++){
      const here=route[i],last=route[i-1];
      if(!M.neighbors[last].includes(here)||!map.roads[M.key(last,here)]||visited.size===4)fail();
      if(map.stops.includes(here))visited.add(here);
    }
    if(p===null)return state;
    record(p,fields);
    if(visited.size!==4||!['ready','play','handoff','paused','lost','won'].includes(p.status))fail();
    const program=build(map,route,p.seed,key);
    if(!number(p.distance,0,program.total)||!number(p.elapsed,0,program.total/R.SPEED+1)||
      !isInt(p.lane,0,2)||!number(p.xLane,0,2)||![null,'jump','slide'].includes(p.pose)||
      !number(p.poseAt,0,p.elapsed)||!isInt(p.lives,0,R.MAX_LIVES)||!number(p.shieldUntil,0,p.elapsed+1.1)||
      !['','lane','jump','slide','handoff','all'].includes(p.noticeKind)||!number(p.noticeUntil,0,p.elapsed+2)||
      !(p.lastHit===null||kinds.includes(p.lastHit)))fail();
    record(p.actions,dirs);
    if(dirs.some(key=>!isInt(p.actions[key],0,0x7fffffff)))fail();
    const terminal=p.status==='won'||p.status==='lost',pending=p.handoff!==null;
    if((p.lives===0)!==(p.status==='lost')||(p.status==='won'&&p.distance!==program.total)||
      (p.status==='ready'&&(p.distance!==0||p.elapsed!==0||p.lives!==R.MAX_LIVES))||
      (!pending&&p.distance===program.total&&p.status!=='won')||
      (pending&&(!['handoff','paused'].includes(p.status)||!number(p.handoff,0,R.HANDOFF_DURATION)||p.handoff>=R.HANDOFF_DURATION||!program.streets.some(s=>s.end===p.distance&&s.stop!==null)))||
      (!pending&&p.status==='handoff'))fail();
    const spans=terminal?[]:program.obstacles.filter(h=>h.length>0&&h.at<=p.distance&&h.at+h.length>p.distance);
    if(!Array.isArray(p.active)||p.active.length!==spans.length)fail();
    for(let i=0;i<spans.length;i++){
      record(p.active[i],['id','struck']);
      if(p.active[i].id!==spans[i].id||typeof p.active[i].struck!=='boolean')fail();
    }
    return state;
  }
  function capture(game,seed){
    const {status,distance,elapsed,lane,xLane,pose,poseAt,lives,shieldUntil,noticeKind,noticeUntil,lastHit}=game;
    const active=status==='won'||status==='lost'?[]:game.activeVehicles.map(s=>({id:s.hazard.id,struck:s.struck}));
    return {seed,status,distance,elapsed,lane,xLane,pose,poseAt,lives,shieldUntil,active,handoff:game.handoff?.elapsed??null,noticeKind:noticeKind||'',noticeUntil,lastHit,actions:{...game.actions}};
  }
  function restore(state){
    validate(state);const {map,route,runner:p}=state;
    if(!p)return null;
    const {seed,status,distance,elapsed,lane,xLane,pose,poseAt,lives,shieldUntil,active,handoff,noticeKind,noticeUntil,lastHit,actions}=p;
    const program=build(map,route,seed),g=R.create(program),layout=progress(program,distance,handoff!==null);
    Object.assign(g,layout,{distance,elapsed,lane,xLane,pose,poseAt,lives,shieldUntil,noticeKind,noticeUntil,lastHit,actions:{...actions}});
    g.hits=R.MAX_LIVES-lives;g.handoffCount=g.delivered.length;
    g.activeVehicles=active.map(s=>({hazard:program.obstacles.find(h=>h.id===s.id),struck:s.struck}));
    g.checked=program.obstacles.filter(h=>h.at<=distance).length;
    if(handoff!==null){const s=program.streets[layout.streetIndex-1];g.handoff={stop:s.stop,elapsed:handoff,duration:R.HANDOFF_DURATION,streetIndex:s.index};}
    g.status=['play','handoff'].includes(status)?'paused':status;
    g.resumeStatus=g.handoff?'handoff':'play';
    g.notice=R.noticeText(g);
    return g;
  }
  function delivered(state){
    validate(state);const p=state.runner;
    return p?progress(build(state.map,state.route,p.seed),p.distance,p.handoff!==null).delivered.length:0;
  }
  const api=Object.freeze({validate,build,capture,restore,delivered});
  if(node)module.exports=api;else root.CourierCheckpoint=api;
})(globalThis);
