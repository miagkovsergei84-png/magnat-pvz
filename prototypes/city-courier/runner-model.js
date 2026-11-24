'use strict';
(function(root){
  // Raise each leg's former speed by exactly one third.
  const SPEED=38.08, MAX_LIVES=5, MAX_STREETS=40, HANDOFF_DURATION=1.75;
  const SPEED_FACTORS=Object.freeze([1,1.12,1.24,1.36]);
  // Round the requested +20%/+50% upward to whole obstacles. Each row
  // occupies at most two lanes even in the busiest final leg.
  const DENSITY=Object.freeze({quiet:Object.freeze([[3,0],[3,2],[4,2],[5,4]]),busy:Object.freeze([[4,2],[5,4],[6,5],[7,7]])});
  const VEHICLES=Object.freeze({parked:Object.freeze(['car-red','van-yellow','car-mint-v4','car-electric-v4','car-pickup-v4','truck-semi-rear-v4','truck-camper-rear-v4']),moving:Object.freeze(['car-teal','car-blue','car-taxi-v4','car-jeep-v4','car-wagon-v4','car-baic-x35-v4','truck-semi-front-v4','truck-trailer-front-v4'])});
  const LONG_SECONDS=Object.freeze({'truck-semi-rear-v4':.44,'truck-camper-rear-v4':.36,'truck-semi-front-v4':.44,'truck-trailer-front-v4':.40});
  const KINDS=Object.freeze({box:'jump',puddle:'jump',cart:'jump',gate:'slide',parked:'lane',moving:'lane'});
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const randomInt=(rng,n)=>Math.floor(rng()*n);
  function compile(map,route,rng=Math.random){
    const routeModel=typeof module!=='undefined'&&module.exports?require('./model.js'):root.CourierMap;
    const info=routeModel.routeInfo(map,route);
    if(!info.complete||route.length-1>MAX_STREETS)throw Error('Invalid runner route');
    let cursor=0,id=0,legStart=0;const visited=new Set(),streets=[],obstacles=[],rows=[],legs=[];
    const firstTheme=(map.depot+route[1])%3;
    for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i],cost=map.roads[routeModel.key(a,b)],busy=cost===3;
      const legIndex=visited.size,theme=(firstTheme+legIndex)%3,speedFactor=SPEED_FACTORS[Math.min(3,legIndex)],velocity=SPEED*speedFactor;
      const [rowCount,pairs]=DENSITY[busy?'busy':'quiet'][legIndex],lead=busy?1.32:1.46,gap=Math.max(1.23,(busy?1.38:1.60)-legIndex*.085),tail=1.22;
      const positions=Array.from({length:rowCount},(_,row)=>Math.round((lead+row*gap)*velocity));
      const start=cursor,length=Math.round((lead+(rowCount-1)*gap+tail)*velocity),end=cursor+length;
      const stop=map.stops.indexOf(b)>=0&&!visited.has(b)?b:null;
      if(stop!==null){visited.add(stop);legs.push({index:legIndex,theme,start:legStart,end,stop});legStart=end;}
      streets.push({index:i-1,a,b,cost,busy,start,end,stop,length,theme,legIndex,speedFactor,rowCount,pairCount:pairs});
      // Exact increasing budgets, randomly distribute the double-obstacle rows
      // rather than letting a later section accidentally become easier.
      const order=Array.from({length:rowCount},(_,i)=>i);for(let j=order.length-1;j>0;j--){const k=randomInt(rng,j+1);[order[j],order[k]]=[order[k],order[j]];}
      const pairRows=new Set(order.slice(0,pairs));
      for(let row=0;row<positions.length;row++){
        const at=start+positions[row],pair=pairRows.has(row);
        // Left-hand traffic: forward-facing (oncoming) vehicles use the
        // right lane; the left and middle lanes show cars from the rear.
        const lane=i===1&&row===0?0:i===2&&row===1?2:randomInt(rng,3),lanes=pair?[lane,(lane+1+randomInt(rng,2))%3]:[lane];
        const types=busy?['car','car','car','car','box','gate','cart','puddle']:['box','puddle','cart','gate','car'];
        const batch=[];
        for(let j=0;j<lanes.length;j++){
          let kind=types[randomInt(rng,types.length)];if(kind==='car')kind=lanes[j]===2?'moving':'parked';
          // The first two blocks introduce all the main moves and cars even
          // on a quiet route. Later traffic has extra vehicles and obstacles.
          if(i===1&&row===0&&j===0)kind='parked';
          if(i===1&&row===1&&j===0)kind='box';
          if(i===2&&row===0&&j===0)kind='gate';
          if(i===2&&row===1&&j===0)kind='moving';
          const hazard={id:id++,at,lane:lanes[j],kind,street:i-1,color:randomInt(rng,5)};
          if(VEHICLES[kind]){const pool=VEHICLES[kind],short=pool.filter(name=>!LONG_SECONDS[name]),long=pool.filter(name=>LONG_SECONDS[name]);const selected=rng()<(busy?.32:.14)?long:short;hazard.vehicle=i===2&&row===1&&j===0?'car-baic-x35-v4':selected[randomInt(rng,selected.length)];hazard.length=velocity*(LONG_SECONDS[hazard.vehicle]||0);}
          obstacles.push(hazard);batch.push(hazard);
        }
        rows.push({at,street:i-1,ids:batch.map(x=>x.id),occupied:batch.map(x=>x.lane)});
      }
      cursor=end;if(visited.size===map.stops.length)break;
    }
    // All roads before the next successful handoff share one environment.
    // Traffic and route distance still come from each individual chosen road.
    const visualModel=typeof module!=='undefined'&&module.exports?require('./street-visual-plan.js'):root.CourierStreetVisuals;
    return {streets,legs,obstacles,rows,total:cursor,plan:streets.reduce((n,s)=>n+s.cost,0),target:map.target,stops:map.stops.slice(),order:streets.filter(s=>s.stop!==null).map(s=>s.stop),visualPlan:visualModel.plan(streets)};
  }
  const factor=g=>SPEED_FACTORS[Math.min(3,g.delivered.length)];
  const speed=g=>SPEED*factor(g);
  function create(program){return {program,status:'ready',distance:0,elapsed:0,lane:1,xLane:1,pose:null,poseAt:0,lives:MAX_LIVES,hits:0,shieldUntil:0,checked:0,activeVehicles:[],streetIndex:0,delivered:[],completedCost:0,notice:'',noticeKind:'',noticeUntil:0,actions:{left:0,right:0,jump:0,slide:0},lastHit:null,handoff:null,handoffCount:0,resumeStatus:'play'};}
  const names=['А','Б','В','Г'],notices={lane:'Машина — смени полосу!',jump:'Перепрыгни препятствие!',slide:'Пригнись под ограждением!',all:'Все четыре посылки доставлены!'};
  function noticeText(g){
    if(g.noticeKind==='handoff')return 'ПВЗ '+names[g.program.stops.indexOf(g.delivered.at(-1))]+' • скорость '+Math.round(factor(g)*100)+'%';
    return notices[g.noticeKind]||'';
  }
  function showNotice(g,kind,duration){g.noticeKind=kind;g.notice=noticeText(g);g.noticeUntil=g.elapsed+duration;}
  function start(g){if(g.status==='ready'||g.status==='paused'){g.status=g.handoff?'handoff':'play';return true;}return false;}
  function pause(g){if(!['play','handoff'].includes(g.status))return false;g.resumeStatus=g.status;g.status='paused';return true;}
  function command(g,action){
    if(g.status!=='play'||!Object.hasOwn(g.actions,action))return false;
    if(action==='left'||action==='right'){
      const next=clamp(g.lane+(action==='left'?-1:1),0,2);if(next===g.lane)return false;g.lane=next;g.actions[action]++;return true;
    }
    if(pose(g).kind!=='run')return false;
    g.pose=action;g.poseAt=g.elapsed;g.actions[action]++;return true;
  }
  function pose(g,at=g.elapsed){
    if(g.pose==='jump'){const t=(at-g.poseAt)/.9;if(t>=0&&t<1)return {kind:'jump',height:Math.sin(t*Math.PI),progress:t};}
    if(g.pose==='slide'){const t=(at-g.poseAt)/.85;if(t>=0&&t<1)return {kind:'slide',height:0,progress:t};}
    return {kind:'run',height:0,progress:0};
  }
  function hit(g,h,at){
    if(at<g.shieldUntil)return;
    const p=pose(g,at),required=KINDS[h.kind];if(required==='jump'&&p.kind==='jump'&&p.height>.27||required==='slide'&&p.kind==='slide')return;
    g.lives--;g.hits++;g.lastHit=h.kind;g.shieldUntil=at+1.1;showNotice(g,required,1.65);
    if(g.lives===0)g.status='lost';
  }
  function advance(g,seconds){
    if(!['play','handoff'].includes(g.status)||!Number.isFinite(seconds)||seconds<=0)return;
    let remaining=Math.min(seconds,.25);
    while(remaining>1e-8&&['play','handoff'].includes(g.status)){
      const dt=Math.min(remaining,.025);remaining-=dt;
      if(g.status==='handoff'){
        g.handoff.elapsed=Math.min(HANDOFF_DURATION,g.handoff.elapsed+dt);
        if(g.handoff.elapsed>=HANDOFF_DURATION-1e-8){
          g.delivered.push(g.handoff.stop);g.handoffCount++;g.handoff=null;
          if(g.distance>=g.program.total){g.status='won';showNotice(g,'all',1.8);}
          else{g.status='play';showNotice(g,'handoff',1.8);g.shieldUntil=Math.max(g.shieldUntil,g.elapsed+.26);}
        }
        continue;
      }
      const previous=g.distance,oldLane=g.xLane,oldTime=g.elapsed,velocity=speed(g);g.elapsed+=dt;
      const current=currentStreet(g),boundary=current?.stop!==null&&current?.stop!==undefined?current.end:g.program.total;
      g.distance=Math.min(g.program.total,boundary,previous+velocity*dt);
      g.xLane=oldLane+clamp(g.lane-oldLane,-dt*6.5,dt*6.5);
      while(g.checked<g.program.obstacles.length&&g.program.obstacles[g.checked].at<=g.distance){
        const h=g.program.obstacles[g.checked++],fraction=clamp((h.at-previous)/(velocity*dt),0,1),x=oldLane+(g.xLane-oldLane)*fraction;
        if(h.length>0)g.activeVehicles.push({hazard:h,struck:false});
        else if(Math.abs(x-h.lane)<.54)hit(g,h,oldTime+fraction*dt);
        if(g.status==='lost')return;
      }
      // A long vehicle occupies its lane for its complete physical length,
      // so dodging its bumper and immediately swiping back still collides.
      for(const span of g.activeVehicles){const h=span.hazard,end=h.at+h.length;
        if(span.struck||previous>end||g.distance<h.at)continue;
        const f0=clamp((h.at-previous)/(velocity*dt),0,1),f1=clamp((end-previous)/(velocity*dt),0,1),x0=oldLane+(g.xLane-oldLane)*f0,x1=oldLane+(g.xLane-oldLane)*f1;
        if(Math.min(x0,x1)<h.lane+.54&&Math.max(x0,x1)>h.lane-.54){span.struck=true;hit(g,h,oldTime+f0*dt);if(g.status==='lost')return;}
      }
      g.activeVehicles=g.activeVehicles.filter(s=>g.distance<s.hazard.at+s.hazard.length);
      while(g.streetIndex<g.program.streets.length&&g.distance>=g.program.streets[g.streetIndex].end){
        const street=g.program.streets[g.streetIndex++];g.completedCost+=street.cost;
        if(street.stop!==null&&street.stop!==undefined){g.distance=street.end;g.pose=null;g.xLane=g.lane;g.handoff={stop:street.stop,elapsed:0,duration:HANDOFF_DURATION,streetIndex:street.index};g.status='handoff';break;}
      }
      if(g.distance>=g.program.total&&g.status==='play'){g.status='won';showNotice(g,'all',2);}
      if(pose(g).kind==='run')g.pose=null;
    }
  }
  function currentStreet(g){return g.program.streets[Math.min(g.streetIndex,g.program.streets.length-1)];}
  function currentLeg(g){const legs=g.program.legs;return legs?.[Math.min(g.delivered.length,legs.length-1)]||currentStreet(g);}
  const api=Object.freeze({SPEED,SPEED_FACTORS,DENSITY,VEHICLES,LONG_SECONDS,HANDOFF_DURATION,MAX_LIVES,MAX_STREETS,KINDS,compile,create,start,pause,command,pose,advance,currentStreet,currentLeg,speed,factor,noticeText});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CourierRunner=api;
})(globalThis);
