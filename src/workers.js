// Worker simulation and presentation cues; branch state is read on demand.
globalThis.PptWorkers = {
  create(deps){
    const {getState,getRuntime,DAY,BIG,W,SERVE_Y,COUNTER_Y,COUNTER_H,FLOOR,FRIDGE_STAND,HEAP,TRUCK,ROBOT_HOME,slotArr,firstWin,lv,fridgeFind,putFloor,winX,moveTo,rnd,slotStand,srcTop,isFront,give,putHome,review,leave,queueFloat,message,float,homeFull,dist,homeOf,slotCap,floorSpot,breakBox}=deps;
// ---------- workers: AI assistant, cashiers, sorters, loaders, robot ----------
// Presentation only: the map is keyed by live worker object and never saved.
// Game time freezes while paused, so repeated renders cannot advance a cue.
const workerVisual = new WeakMap();
function workerCue(w, cue){
  const visual=workerVisual.get(w)||{};
  visual.cue=cue;visual.until=getRuntime().clock+.35;
  workerVisual.set(w,visual);
}
function workerMotion(w){
  const visual=workerVisual.get(w);
  if(!visual)return 'idle';
  if(visual.cue&&getRuntime().clock<visual.until)return visual.cue;
  return visual.moving?'walk':'idle';
}
function topMatch(n){const cl=slotArr(n.c,n.s),tp=cl[cl.length-1];return !!tp&&tp.c===n.c&&tp.s===n.s&&!tp.r;}
// A marked order gives the player a short first opportunity. Its timer starts
// when it reaches the front; an unmarked legacy order remains ordinary.
function waitingForPersonalCheck(cu){
  return cu?.personalCheck===true&&(!Number.isFinite(cu.personalUntil)||getRuntime().clock<cu.personalUntil);
}
function cashPick(w){
  const roaming=w.kind==='cash';
  const own=getRuntime().q[w.win]?.[0],cands=[];
  if(roaming)getRuntime().q.forEach((l,i)=>{const f=l[0];if(i>=firstWin()&&f&&f.state==='wait'&&!f.claim&&!f.houseCyclist&&!waitingForPersonalCheck(f))cands.push(f);});
  else{
    if(own&&own.state==='wait'&&!own.claim&&!own.houseCyclist&&!waitingForPersonalCheck(own))cands.push(own);
    if(w.kind==='ai'&&lv('ai')>=2)getRuntime().q.forEach((l,i)=>{const f=l[0];if(i!==w.win&&f&&f.state==='wait'&&!f.claim&&!f.houseCyclist&&!waitingForPersonalCheck(f)&&f.pt/f.max<.35)cands.push(f);});
  }
  const ready=[];
  for(const cu of cands){
    if(cu.ret){ready.push({cu,ret:true});continue;}
    const stored=deps.houseSource?.(cu.need);
    if(stored){ready.push({cu,src:stored});continue;}
    for(const n of cu.need){const fi=fridgeFind(n);if(fi>=0){ready.push({cu,src:{fz:fi}});break;}
      if(topMatch(n)){ready.push({cu,src:{c:n.c,s:n.s}});break;}}
  }
  if(roaming)ready.sort((a,b)=>(a.cu.pt/a.cu.max)-(b.cu.pt/b.cu.max)
    ||Number(b.cu.win===w.win)-Number(a.cu.win===w.win)||a.cu.win-b.cu.win);
  return ready[0]||null;
}
function release(w){if(w.cu&&w.cu.claim===w)w.cu.claim=null;w.cu=null;w.st='idle';w.cool=.3;delete w.physicalReturn;}
// Expired carried parcels are waste. Leave them near the worker for manual
// collection; only a completely full floor sends them to the overflow heap.
// A destination applies to the first carried parcel, so retain it if only a
// later parcel spoiled. Never treat an ordinary customer return as spoilage.
function dropSpoiledCarry(w){
  const firstSpoiled=!!w.carry[0]?.spoiled;
  let dropped=false;
  for(let i=w.carry.length-1;i>=0;i--)if(w.carry[i]?.spoiled){
    const b=w.carry.splice(i,1)[0];
    if(!putFloor(b,w.x,w.y))getState().heap++;
    dropped=true;
  }
  if(dropped){if(firstSpoiled)w.dest=null;workerCue(w,'interact');}
  return dropped;
}
function workerSpeed(w){
  if(w.kind==='ai')return 150*.75;
  if(w.kind==='robot')return 150*(lv('tune')?.8:.6);
  let v=150*(.5+.08*w.s.spd)*(w.s.trait==='fast'?1.25:1);
  if(w.s.trait==='sleepy'&&getRuntime().clock>DAY-40)v*=.7;
  return v;
}
// Workers, like the player, slow down near a spill until it is cleaned.
const wsp=w=>workerSpeed(w)*(w.carry.some(b=>b.s===BIG)?.65:1)*
  ((getRuntime().mess||[]).some(m=>dist(w.x,w.y,m.x,m.y)<20)?.7:1);
// A parcel or customer's remaining order may change while a cashier walks.
// Careful staff verify the live order, including when restoring an older shift.
function matchesOrder(cu,b){return !!b&&!b.r&&!!cu&&Array.isArray(cu.need)&&cu.need.some(n=>n.c===b.c&&n.s===b.s);}
function returnMismatched(w,dt){
  const b=w.carry[0];
  if(!b){release(w);return;}
  const h=homeOf(b);
  // A protected fragile parcel is kept with the worker and physically
  // returned, rather than disappearing or teleporting into storage.
  if(w.physicalReturn&&(h.fz||slotArr(h.c,h.s).length<slotCap(h.c,h.s))){
    const target=h.fz?FRIDGE_STAND:slotStand(h.c,h.s);
    if(!moveTo(w,target.x,target.y,wsp(w),dt))return;
  }
  if(h.fz||slotArr(h.c,h.s).length<slotCap(h.c,h.s)){putHome(b,w.x,w.y+200);w.carry.shift();}
  else if(putFloor(b,w.x,w.y+200))w.carry.shift();
  // If both storage and floor are full, retain the parcel until space opens.
  if(!w.carry.length)release(w);
}
function updCash(w,dt){
  if(deps.housePowerOff?.())return;
  const sp=wsp(w),home={x:winX(w.win),y:SERVE_Y+4};
  if((w.st==='ret'||w.st==='returnWrong')&&dropSpoiledCarry(w)){
    // Cashiers carry one parcel in normal play. The waiting customer can be
    // claimed again if a different usable parcel becomes available.
    release(w);
    return;
  }
  // A restored or changed customer may acquire a personal check after a
  // worker claimed it. Release the claim; put any parcel back safely rather
  // than serving early or keeping it reserved during the waiting window.
  if(['fetch','takeReturn','ret'].includes(w.st)&&waitingForPersonalCheck(w.cu)){
    if(w.st==='ret'&&w.carry.length){
      if(w.cu.claim===w)w.cu.claim=null;
      w.cu=null;w.st='returnWrong';returnMismatched(w,dt);
    }else release(w);
    return;
  }
  if(w.st==='idle'){moveTo(w,home.x,home.y,sp,dt);w.cool-=dt;
    if(w.cool<=0){const pk=cashPick(w);
      if(pk){w.cu=pk.cu;pk.cu.claim=w;
        if(pk.ret){w.st='takeReturn';}
        else{w.src=pk.src;
          if(w.err&&pk.src.fz==null&&pk.src.s<BIG&&Math.random()<w.err){const alt=[0,1,2,3].filter(x=>x!==pk.src.s&&x<getRuntime().cfg.shapes&&getState().stock[pk.src.c][x].length);if(alt.length)w.src={c:pk.src.c,s:alt[rnd(alt.length)],wrong:true};}
          w.st='fetch';}
      }else w.cool=.4;}}
  else if(w.st==='fetch'){
    if(w.cu.state!=='wait'){release(w);return;}
    const st=w.src.store?deps.sourceStand(w.src):w.src.fz!=null?FRIDGE_STAND:slotStand(w.src.c,w.src.s);
    if(moveTo(w,st.x,st.y,sp,dt)){const b=srcTop(w.src);
      if(b&&(w.src.store||w.src.wrong||w.src.fz!=null||topMatch(w.src))&&(w.s?.trait!=='careful'||matchesOrder(w.cu,b))){if(w.src.store)deps.sourceTake(w.src);else if(w.src.fz!=null)getState().fridge[w.src.fz]=null;else slotArr(w.src.c,w.src.s).pop();w.carry=[b];w.st='ret';workerCue(w,'interact');}else release(w);}}
  else if(w.st==='ret'){
    if(w.s?.trait==='careful'&&!matchesOrder(w.cu,w.carry[0])){
      if(w.cu&&w.cu.claim===w)w.cu.claim=null;
      w.cu=null;w.st='returnWrong';returnMismatched(w,dt);return;
    }
    if(moveTo(w,winX(w.cu.win),SERVE_Y,sp,dt)){const b=w.carry.pop();let cod=false;
      if(w.cu.state==='wait'&&isFront(w.cu)){w.cu.claim=null;const served=getRuntime().st.served;cod=give(w.cu,b,w);if(getRuntime().st.served>served)workerCue(w,'service');}
      else putHome(b,w.x,w.y+200);
      if(w.carry.length){w.cu=null;w.st='returnWrong';w.physicalReturn=true;w.cool=.3;}
      else release(w);if(cod)w.cool=1.5;}}
  else if(w.st==='returnWrong')returnMismatched(w,dt);
  else if(w.st==='takeReturn'){
    if(!w.cu||w.cu.state!=='wait'||!isFront(w.cu)||!w.cu.ret){release(w);return;}
    if(moveTo(w,winX(w.cu.win),COUNTER_Y+COUNTER_H+12,sp,dt)){
      if(w.cu.state==='wait'&&isFront(w.cu)&&w.cu.ret){
        const cu=w.cu,b=cu.ret;cu.ret=null;const shared=deps.shareReturn?.();w.carry=shared?[]:[b];
        getState().cash+=3;getRuntime().st.revenue+=3;review(5);leave(cu,true);
        queueFloat(cu,-30,message('fReturn'),'#4cd18a');if(shared)release(w);else w.st='dropReturn';workerCue(w,'service');
      }else release(w);
    }
  }
  else if(w.st==='dropReturn'){
    if(moveTo(w,HEAP.x+28,HEAP.y,sp,dt)){
      getState().heap++;w.carry=[];float(HEAP.x,HEAP.y-26,'↩','#c9a25b');release(w);workerCue(w,'interact');
    }
  }
}
function pickFloor(w){
  let best=null,bd=1e9;
  getState().floor.forEach((st,i)=>{if(!st.length)return;const b=st[st.length-1];if(b.r||homeFull(b))return;
    if(getRuntime().workers.some(o=>o!==w&&o.tg&&o.tg.i===i))return;
    const d=dist(w.x,w.y,FLOOR[i].x,FLOOR[i].y);if(d<bd){bd=d;best={i,x:FLOOR[i].x,y:FLOOR[i].y+16};}});
  return best;
}
function takeInto(w,arr,fromTruck){
  const before=w.carry.length;
  while(arr.length&&w.carry.length<w.cap){const b=fromTruck?arr[0]:arr[arr.length-1];if(b.r)break;
    if(b.s===BIG&&w.carry.length)break;
    if(fromTruck){arr.shift();b.ready=getRuntime().clock+6+Math.random()*10;}else arr.pop();
    w.carry.push(b);if(b.s===BIG)break;}
  if(w.carry.length>before)workerCue(w,'interact');
}
function updSort(w,dt){
  if(dropSpoiledCarry(w))return;
  const sp=wsp(w);
  if(!w.carry.length){
    if(!w.tg||(w.tg.i!=null&&!getState().floor[w.tg.i].length))w.tg=pickFloor(w);
    if(!w.tg&&w.kind==='robot'&&getRuntime().truck&&!getRuntime().truck.dump&&getRuntime().truck.cargo.length)w.tg={truck:true,x:W/2+40,y:TRUCK.y-14};
    if(!w.tg){const h=w.kind==='robot'?ROBOT_HOME:{x:140+(w.s?w.s.id%5:0)*30,y:368};moveTo(w,h.x,h.y,sp,dt);return;}
    if(moveTo(w,w.tg.x,w.tg.y,sp,dt)){
      if(w.tg.truck){if(getRuntime().truck&&getRuntime().truck.cargo.length)takeInto(w,getRuntime().truck.cargo,true);}
      else takeInto(w,getState().floor[w.tg.i],false);
      w.tg=null;}
    return;}
  const b=w.carry[0];
  if(!w.dest){w.dest=homeOf(b);
    if(!w.dest.fz&&b.s<BIG&&w.err&&Math.random()<w.err){const alt=[0,1,2,3].filter(x=>x!==b.s&&x<getRuntime().cfg.shapes);if(alt.length){w.dest.s=alt[rnd(alt.length)];w.dest.wrong=true;}}}
  const st=w.dest.fz?FRIDGE_STAND:slotStand(w.dest.c,w.dest.s);
  if(moveTo(w,st.x,st.y+(w.dest.fz?0:6),sp,dt)){
    if(w.dest.fz){const j=getState().fridge.findIndex(v=>!v);if(j>=0)getState().fridge[j]=w.carry.shift();else putHome(w.carry.shift(),st.x,st.y+60);}
    else{const cl=slotArr(w.dest.c,w.dest.s);
      if(cl.length<slotCap(w.dest.c,w.dest.s)){
        const fragileWrong=b.f&&(w.dest.c!==b.c||w.dest.s!==b.s);
        if(fragileWrong){
          // The first protected mistake retains the same parcel and goes
          // straight to its correct destination without rerolling an error.
          if(breakBox(st.x,st.y+6)){w.carry.shift();w.dest=null;}
          else w.dest=homeOf(b);
          workerCue(w,'interact');return;
        }
        cl.push(w.carry.shift());if(w.dest.wrong){getRuntime().shake[w.dest.c+'_'+w.dest.s]=.4;float(st.x,st.y-40,message('fMisplace',{staffName:w.s.n}),'#ff5d5d');}}
      else{const carried=w.carry[0];
        // Another worker may fill this slot after it was chosen. If the floor
        // also filled, use the normal overflow path instead of losing the parcel.
        if(!putFloor(carried,st.x,st.y+100))putHome(carried,st.x,st.y+100);
        w.carry.shift();}}
    w.dest=null;workerCue(w,'interact');}
}
function updLoad(w,dt){
  if(dropSpoiledCarry(w))return;
  const tr=getRuntime().truck,sp=wsp(w);
  // A parcel picked up from the floor must finish the sorter task even if a
  // truck arrives meanwhile; otherwise it would be put back on the floor.
  // A restored worker can have a stale sorting flag after the last delivery.
  // With empty hands, choose the next task using the current truck state.
  if(w.sorting&&!w.carry.length)w.sorting=false;
  if(w.sorting){
    // A cold parcel's destination may change while another worker fills or
    // frees the fridge. Re-route before reaching the old destination instead
    // of letting the sorter's capacity fallback send it remotely elsewhere.
    if(w.carry.length&&w.dest&&!!w.dest.fz!==!!homeOf(w.carry[0]).fz)w.dest=null;
    updSort(w,dt);
    if(!w.carry.length)w.sorting=false;
    return;
  }
  if(w.carry.length){
    const i=floorSpot(150+(w.s.id%3)*40,480,w.carry[0]);
    // With no compatible floor cell, deliver the existing load physically.
    // The sorting flag survives saves and keeps new truck pickups waiting.
    if(i<0){
      w.sorting=true;w.dest=null;
      float(w.x,w.y-20,message('fFloorFull'),'#ffb27a');
      updSort(w,dt);
      if(!w.carry.length)w.sorting=false;
      return;
    }
    const tx=FLOOR[i].x,ty=FLOOR[i].y+16;
    if(moveTo(w,tx,ty,sp,dt)){
      let overflow=false;
      while(w.carry.length){
        const b=w.carry[0];
        if(putFloor(b,tx,ty-16))w.carry.shift();
        else{
          // The last compatible floor cell filled during the walk. Keep any
          // remainder in hand and start its physical shelf route next frame;
          // this frame's movement was already spent reaching the floor cell.
          w.sorting=true;w.dest=null;
          overflow=true;
          break;
        }
      }
      if(overflow)float(tx,ty-20,message('fFloorFull'),'#ffb27a');
      workerCue(w,'interact');
    }
    return;
  }
  if(tr&&!tr.dump&&tr.cargo.length){
    if(moveTo(w,TRUCK.x+20+(w.s.id%3)*30,TRUCK.y-14,sp,dt))takeInto(w,tr.cargo,true);
    return;
  }
  updSort(w,dt);
  if(w.carry.length)w.sorting=true;
}
function updWorkers(dt){for(const w of getRuntime().workers){const x=w.x,y=w.y;if(w.kind==='ai'||w.kind==='cash')updCash(w,dt);else if(w.kind==='load')updLoad(w,dt);else updSort(w,dt);const visual=workerVisual.get(w)||{};visual.moving=w.x!==x||w.y!==y;workerVisual.set(w,visual);}}

    return {workerCue,workerMotion,topMatch,cashPick,release,dropSpoiledCarry,workerSpeed,wsp,updCash,pickFloor,takeInto,updSort,updLoad,updWorkers};
  }
};
