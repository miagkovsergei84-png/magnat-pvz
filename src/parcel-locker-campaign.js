// The campaign locker keeps the original parcels, not a second set of demo orders.
globalThis.PptCampaignLocker=(()=>{
  function create(){return {version:1,nextId:1,closing:false,slots:Array(6).fill(null)};}
  // All timings remain below the limits in the v1 save validator. Exit
  // silhouettes are presentation state: the actual order has already been
  // loaded/received and must not be paid or recreated when they leave.
  const TIME=Object.freeze({courierArrival:1.5,courierLoad:.45,courierExit:1.4,courierClear:.25,
    customerArrival:1.2,customerApproach:.7,customerPickup:.25,customerExit:1.2});
  const courierReady=TIME.courierArrival+TIME.courierLoad;
  const customerDone=TIME.customerArrival+TIME.customerApproach+TIME.customerPickup;
  const fraction=(value,duration)=>Math.max(0,Math.min(1,value/duration));
  function runtime(){return {courier:null,customer:null,courierExit:null,customerExit:null};}
  // Active old saves contain the original 2.5/4 and 2.4/3.5 timings.
  // Convert their progress without losing their reservation or jumping back
  // to the start of the route. The original saved graph is not overwritten
  // until the ordinary save flow is used.
  function courierTime(actor,order){
    const t=Math.max(0,Number(actor?.elapsed)||0);
    if(actor?.routeVersion===2)return t;
    return order?.status==='loading'
      ?TIME.courierArrival+fraction(t-2.5,1.5)*TIME.courierLoad
      :fraction(t,2.5)*TIME.courierArrival;
  }
  function customerTime(actor){
    const t=Math.max(0,Number(actor?.elapsed)||0);
    if(actor?.routeVersion===2)return t;
    return t<=2.4?fraction(t,2.4)*TIME.customerArrival:
      TIME.customerArrival+fraction(t-2.4,1.1)*(TIME.customerApproach+TIME.customerPickup);
  }
  function elapsedExit(actor){return Math.max(0,Number(actor?.elapsed)||0);}
  function scene(state,run){
    if(!run||!state)return {courier:null,customer:null};
    let courier=null,customer=null;
    if(run.courier){
      const actor=run.courier,order=state.slots?.[actor.slot];
      if(order?.id===actor.id){const t=courierTime(actor,order);
        courier=t<TIME.courierArrival
          ?{phase:'arrive',progress:fraction(t,TIME.courierArrival),parcel:order.parcel}
          :{phase:'service',progress:fraction(t-TIME.courierArrival,TIME.courierLoad),parcel:order.parcel};
      }
    }else if(run.courierExit){
      courier={phase:'depart',progress:fraction(elapsedExit(run.courierExit),TIME.courierExit),parcel:null};
    }
    if(run.customer){
      const actor=run.customer,t=customerTime(actor),order=state.slots?.[actor.slot];
      if(order?.id===actor.id){
        const blocked=!!run.courier||!!(run.courierExit&&elapsedExit(run.courierExit)<TIME.courierClear);
        let phase,progress;
        if(t<TIME.customerArrival){phase='arrive';progress=fraction(t,TIME.customerArrival);}
        else if(blocked){phase='wait';progress=1;}
        else if(t<TIME.customerArrival+TIME.customerApproach){phase='approach';progress=fraction(t-TIME.customerArrival,TIME.customerApproach);}
        else{phase='service';progress=fraction(t-TIME.customerArrival-TIME.customerApproach,TIME.customerPickup);}
        customer={phase,progress,shirt:actor.shirt,vip:actor.vip,parcel:null};
      }
    }else if(run.customerExit){
      const actor=run.customerExit;
      customer={phase:'depart',progress:fraction(elapsedExit(actor),TIME.customerExit),shirt:actor.shirt,vip:actor.vip,parcel:actor.parcel};
    }
    return {courier,customer};
  }
  function reserve(state,cargo){
    if(state.closing)return 0;
    let count=0;
    // Parcels not suitable for the locker, and all overflow, stay in the truck.
    for(let i=cargo.length-1;i>=0;i--){
      const parcel=cargo[i],slot=state.slots.indexOf(null);
      if(i%3!==0||slot<0||parcel.r||parcel.f||parcel.cold!=null||parcel.s===4)continue;
      if(!Number.isSafeInteger(state.nextId)||state.nextId>=Number.MAX_SAFE_INTEGER)break;
      state.slots[slot]={id:state.nextId++,parcel,status:'queued'};
      cargo.splice(i,1);count++;
    }
    return count;
  }
  function startCustomer(state,run,customer){
    if(run.customer||run.customerExit)return false;
    const slot=state.slots.findIndex(value=>value?.status==='ready');
    if(slot<0)return false;
    const order=state.slots[slot];order.status='claimed';
    run.customer={...customer,slot,id:order.id,elapsed:0,routeVersion:2};return true;
  }
  function update(state,run,dt){
    if(!Number.isFinite(dt)||dt<=0)return null;
    // Do not put two couriers or two visitors on top of one another. An
    // entering visitor can wait safely while the current courier finishes.
    if(run.customerExit){run.customerExit.elapsed=elapsedExit(run.customerExit)+dt;if(run.customerExit.elapsed>=TIME.customerExit)run.customerExit=null;}
    if(!run.courier&&!run.customer&&!run.courierExit&&!run.customerExit){
      const slot=state.slots.findIndex(value=>value?.status==='queued');
      if(slot>=0){const order=state.slots[slot];order.status='approaching';run.courier={slot,id:order.id,elapsed:0,routeVersion:2};}
    }
    let customerBlocked=0;
    if(run.courier){
      const c=run.courier,order=state.slots[c.slot];
      if(!order||order.id!==c.id||!['approaching','loading'].includes(order.status))run.courier=null;
      else{
        c.elapsed=courierTime(c,order);c.routeVersion=2;
        customerBlocked=Math.max(0,courierReady-c.elapsed)+TIME.courierClear;
        c.elapsed+=dt;
        if(c.elapsed>=TIME.courierArrival)order.status='loading';
        if(c.elapsed>=courierReady){
          const exitElapsed=c.elapsed-courierReady;order.status='ready';run.courier=null;
          run.courierExit=exitElapsed<TIME.courierExit?{elapsed:exitElapsed}:null;
        }
      }
    }else if(run.courierExit){
      const e=elapsedExit(run.courierExit);customerBlocked=Math.max(0,TIME.courierClear-e);
      run.courierExit.elapsed=e+dt;if(run.courierExit.elapsed>=TIME.courierExit)run.courierExit=null;
    }
    if(run.customer){
      const customer=run.customer,order=state.slots[customer.slot];
      if(!order||order.id!==customer.id||order.status!=='claimed'){run.customer=null;return null;}
      customer.elapsed=customerTime(customer);customer.routeVersion=2;
      const blocked=Math.min(dt,customerBlocked);
      if(customer.elapsed<TIME.customerArrival)customer.elapsed=Math.min(TIME.customerArrival,customer.elapsed+blocked);
      customer.elapsed+=dt-blocked;
      if(customer.elapsed>=customerDone){
        const exitElapsed=customer.elapsed-customerDone,parcel=order.parcel;
        state.slots[customer.slot]=null;run.customer=null;
        run.customerExit=exitElapsed<TIME.customerExit?{shirt:customer.shirt,vip:customer.vip,parcel,elapsed:exitElapsed}:null;
        return {customer,parcel,id:order.id};
      }
    }
    return null;
  }
  function endShift(state,run){
    for(const order of state.slots)if(order){if(order.status==='approaching'||order.status==='loading')order.status='queued';else if(order.status==='claimed')order.status='ready';}
    if(run){run.courier=null;run.customer=null;run.courierExit=null;run.customerExit=null;}
  }
  return Object.freeze({create,runtime,reserve,startCustomer,update,endShift,scene,timing:TIME});
})();
