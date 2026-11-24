'use strict';
(()=>{
  const M=CourierMap,R=CourierRunner,U=CourierRunnerUI,I=CourierText,L=I.choose,C=CourierCampaign,el=id=>document.getElementById(id),svg=el('map');
  const pos=i=>[50+i%5*100,50+Math.floor(i/5)*100],p=i=>pos(i).join(',');
  let map,route,mode='plan',note=null,initialized=!C.requested,request=null,requestTimer=null,error=null;
  const line=(a,b,stroke,width,dash='')=>{const [x1,y1]=pos(a),[x2,y2]=pos(b);return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"${dash?' stroke-dasharray="'+dash+'"':''}/>`;};
  const blocks=()=>{
    const palette=['#d79772','#d6be83','#94b3b7','#cbb6a2','#adbec4','#c0a7b4'];let out='<rect width="500" height="500" fill="#bbcda5"/>';
    for(let x=0;x<4;x++)for(let y=0;y<4;y++){
      let left=65+x*100,top=65+y*100,index=y*4+x;
      out+=`<rect x="${left}" y="${top}" width="70" height="70" rx="4" fill="#e1d6b9" stroke="#a8b899" stroke-width="2"/>`;
      if(index%5===2){out+=`<rect x="${left+4}" y="${top+4}" width="62" height="62" rx="5" fill="#9abc89"/><path d="M${left+35} ${top+8}v54M${left+8} ${top+35}h54" stroke="#e9ddba" stroke-width="5"/>`;for(const [dx,dy] of [[12,12],[50,12],[12,50],[50,50]])out+=`<circle cx="${left+dx}" cy="${top+dy}" r="9" fill="#427f59"/><circle cx="${left+dx-2}" cy="${top+dy-2}" r="5" fill="#71a16b"/>`;}
      else {const color=palette[index%palette.length];out+=`<rect x="${left+9}" y="${top+12}" width="55" height="49" rx="3" fill="#53665b" opacity=".24"/><rect x="${left+5}" y="${top+6}" width="54" height="48" rx="3" fill="${color}" stroke="#fff0cf" stroke-width="2"/><rect x="${left+10}" y="${top+11}" width="44" height="6" rx="2" fill="#ffffff" opacity=".3"/>`;for(let d=0;d<3;d++)out+=`<rect x="${left+11+d*14}" y="${top+29}" width="10" height="12" rx="1" fill="#5e7987" opacity=".78"/>`;}
    }
    return out;
  };
  function van(x,y){return `<g transform="translate(${x} ${y})" filter="drop-shadow(0 2px 3px #183c3d88)" id="van"><circle r="16" fill="#8a37c4" stroke="#fff3ff" stroke-width="2"/><path d="M-8-5 0-10 8-5 8 5 0 10-8 5Z" fill="#ecd0a1" stroke="#62396c" stroke-width="1.5"/><path d="M-8-5 0-1 8-5M0-1v11" fill="none" stroke="#9c7246" stroke-width="1.5"/></g>`;}
  function renderMap(){
    const info=M.routeInfo(map,route),cursor=route.at(-1),available=mode==='plan'&&!info.complete?M.neighbors[cursor].filter(n=>map.roads[M.key(cursor,n)]):[],visited=info.delivered;
    let art=blocks();
    for(const [key,cost] of Object.entries(map.roads)){const [a,b]=key.split('-').map(Number);art+=line(a,b,'#9aa7a2',24)+line(a,b,'#687d7e',19)+line(a,b,'#dde0d2',1.5,'6 8');
      if(cost===3)art+=line(a,b,'#e7a149',9,'5 5');
      if(cost===0){art+=line(a,b,'#b85555',10,'4 5');const [ax,ay]=pos(a),[bx,by]=pos(b),x=(ax+bx)/2,y=(ay+by)/2;art+=`<circle cx="${x}" cy="${y}" r="9" fill="#db615a" stroke="#fff3e0" stroke-width="2"/><path d="M${x-4} ${y}h8" stroke="white" stroke-width="2.5"/>`;}
    }
    if(route.length>1)art+=`<polyline points="${route.map(p).join(' ')}" stroke="#fff7bd" stroke-width="10" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".8"/><polyline points="${route.map(p).join(' ')}" stroke="#26b98a" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
    for(let i=0;i<M.count;i++){
      const [x,y]=pos(i),letter=map.stops.indexOf(i),isStop=letter>=0,done=visited.includes(i);let badge='';
      if(isStop)badge=`<circle cx="${x}" cy="${y}" r="15" fill="${done?'#77cda1':'#ffcf69'}" stroke="${done?'#316c48':'#8d5125'}" stroke-width="2.5"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="15" font-weight="900" fill="#3e4435">${done?'✓':I.stop(letter)}</text>`;
      else if(i===map.depot)badge=`<rect x="${x-15}" y="${y-14}" width="30" height="28" rx="5" fill="#7558b7" stroke="#fff0ff" stroke-width="2"/><text x="${x}" y="${y+5}" text-anchor="middle" font-weight="900" font-size="12" fill="white">${L('ПВЗ','HQ')}</text>`;
      else badge=`<circle class="cross" cx="${x}" cy="${y}" r="7"/>`;
      art+=`<g class="node ${available.includes(i)?'available':''} ${cursor===i?'current':''}" data-node="${i}" role="button" tabindex="0" aria-label="${isStop?L('ПВЗ ','Pickup point ')+I.stop(letter):i===map.depot?L('Наш пункт','Our pickup point'):L('Перекрёсток ','Crossing ')+(i%5+1)+', '+(Math.floor(i/5)+1)}">${available.includes(i)?`<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="#56ed9d" stroke-width="4"/>`:''}${badge}<circle class="hit" cx="${x}" cy="${y}" r="23"/></g>`;
    }
    const [x,y]=pos(cursor);art+=van(x,y);svg.innerHTML=art;
  }
  function setNote(ru,en){note=[ru,en];el('message').textContent=L(ru,en);}
  function update(){
    const info=M.routeInfo(map,route),plan=mode==='plan'&&!request,minutes=L(' мин',' min');
    el('time').textContent=info.cost+minutes;el('time').classList.toggle('over',info.cost>map.target);
    el('deliveries').textContent=info.delivered.length+'/4';el('budget').textContent='≤ '+map.target+minutes;
    const chosen=route.length-1,crossings=el('selected-crossings');crossings.textContent=String(chosen);crossings.setAttribute('aria-label',L(`Выбрано перекрёстков: ${chosen}`,`Selected crossings: ${chosen}`));
    el('undo').disabled=!plan||route.length===1;el('reset').disabled=!plan||route.length===1;el('dispatch').disabled=!plan||!info.complete;el('new').disabled=!plan||C.requested;el('campaign-exit').disabled=!plan;
    el('dispatch').textContent=L('Начать доставку','Start delivery');
    el('new').textContent=L('Другой район — новый маршрут','New district — new route');
    if(note)el('message').textContent=L(...note);renderMap();
  }
  function draft(){return {v:1,map,route,runner:mode==='runner'?U.checkpoint():null};}
  function checkpoint(){if(C.embedded&&initialized&&!request)C.send('checkpoint',{state:draft()});}
  function showError(value){
    error=value;
    const status=el('campaign-error');status.hidden=!value;
    status.textContent=value?L(...value):'';
  }
  function setRequest(value){
    clearTimeout(requestTimer);request=value;
    if(mode==='runner')U.setWaiting(!!value);else update();
    if(value)requestTimer=setTimeout(()=>saved({request:value,ok:false}),8000);
  }
  function saved(result){
    if(result.request==='checkpoint'){
      if(!request)showError(result.ok?null:['Не удалось сохранить прогресс. Попробуй ещё раз.','Couldn’t save your progress. Try again.']);
      return;
    }
    if(request!==result.request||result.ok)return;
    setRequest(null);
    showError(result.request==='exit'
      ?['Не удалось сохранить. Попробуй выйти ещё раз.','Couldn’t save. Try to exit again.']
      :['Не удалось подтвердить доставку. Нажми «Далее» ещё раз.','Couldn’t confirm the delivery. Press Continue again.']);
  }
  function askParent(type){
    if(!C.embedded||!initialized||request)return;
    const data={state:draft()};
    if(type==='complete')data.delivered=4;
    showError(null);setRequest(type);C.send(type,data);
  }
  function exit(){U.suspend();askParent('exit');}
  function newDistrict(){
    if(!initialized||request)return;
    map=M.generate();route=[map.depot];mode='plan';
    setNote('Нажимай зелёные перекрёстки. Посети все четыре ПВЗ: А, Б, В и Г.','Select the green crossings. Visit all four pickup points: A, B, C and D.');
    update();checkpoint();
  }
  function choose(i){if(!initialized||request||mode!=='plan')return;const from=route.at(-1);if(i===from)return;
    if(M.routeInfo(map,route).complete){setNote('Маршрут уже готов. Начни доставку или отмени последний шаг.','Your route is ready. Start the delivery or undo the last step.');return;}
    if(route.length-1>=R.MAX_STREETS){setNote('Слишком много улиц. Отмени несколько шагов и сократи маршрут.','Too many streets. Undo some steps to shorten your route.');return;}
    if(!M.neighbors[from].includes(i)){setNote('Выбери один из соседних перекрёстков — они подсвечены.','Choose one of the highlighted neighboring crossings.');return;}
    if(!map.roads[M.key(from,i)]){setNote('Эта улица перекрыта. Попробуй другой путь.','This street is closed. Try a different way.');return;}
    route.push(i);const info=M.routeInfo(map,route);
    if(info.complete){
      if(info.cost<=map.target)setNote('Готово! Начни доставку по выбранному маршруту.','All set! Start the delivery along your route.');
      else setNote('Маршрут длиннее цели. Можно сократить или начать доставку.','The route is over the time goal. Shorten it or start anyway.');
    }else if(map.stops.includes(i))setNote('Ещё одна точка в маршруте. Продолжай!','Another stop added. Keep going!');
    else setNote('На оранжевых улицах больше машин, а путь дольше.','Orange streets have more traffic and take longer.');
    update();checkpoint();
  }
  svg.addEventListener('click',e=>{const node=e.target.closest('[data-node]');if(node)choose(Number(node.dataset.node));});
  svg.addEventListener('keydown',e=>{const node=e.target.closest('[data-node]');if(node&&[' ','Enter'].includes(e.key)){e.preventDefault();const i=Number(node.dataset.node);choose(i);svg.querySelector(`[data-node="${i}"]`)?.focus();}});
  el('undo').onclick=()=>{
    if(!initialized||mode!=='plan'||request||route.length===1)return;
    route.pop();setNote('Последний шаг отменён. Выбери другой путь.','Last step undone. Choose another way.');update();checkpoint();
  };
  el('reset').onclick=()=>{
    if(!initialized||mode!=='plan'||request)return;
    route=[map.depot];setNote('Маршрут сброшен, посылки по-прежнему на нашем складе.','Route reset. Your parcels are still at our depot.');update();checkpoint();
  };
  el('new').onclick=()=>{if(!C.requested)newDistrict();};
  const back=()=>{mode='plan';setNote('Маршрут сохранён. Можно изменить его или начать доставку снова.','Your route is saved. Edit it or start another delivery.');update();checkpoint();};
  function openRunner(savedState){
    mode='runner';
    U.open(map,route,back,C.embedded?{savedState,onCheckpoint:checkpoint,onComplete:()=>askParent('complete'),onExit:exit}:null);
  }
  el('dispatch').onclick=()=>{if(initialized&&mode==='plan'&&!request&&M.routeInfo(map,route).complete)openRunner(null);};
  el('campaign-exit').onclick=exit;
  if(C.requested){
    document.body.classList.add('campaign-mode');
    el('planner').hidden=true;
    el('campaign-wait').hidden=false;
    el('campaign-exit').hidden=false;
    el('new').hidden=true;
    const connected=C.connect({
      init(data){
        I.set(data.lang);initialized=true;el('campaign-wait').hidden=true;el('planner').hidden=false;
        let state=null;
        if(data.state!=null)try{state=CourierCheckpoint.validate(data.state);}catch{showError(['Не удалось восстановить маршрут. Составь новый.','Couldn’t restore the route. Plan a new one.']);}
        if(!state){newDistrict();return;}
        map=state.map;route=state.route;mode='plan';
        setNote('Маршрут восстановлен. Можно продолжить с сохранённого места.','Route restored. Continue where you left off.');
        update();if(state.runner)openRunner(state);else checkpoint();
      },
      settings(data){if((data.lang==='ru'||data.lang==='en')&&I.set(data.lang)){showError(error);if(mode==='runner')U.refresh();else update();}},
      pause(){if(!U.suspend())checkpoint();},
      back(){if(!U.suspend())exit();},
      saveResult:saved
    });
    if(!connected)el('campaign-wait').textContent=L('Открой доставку из основной игры.','Open the delivery from the main game.');
    rootPageHide();
    addEventListener('blur',()=>queueMicrotask(()=>{if(!document.hasFocus())U.suspend();}));
  }else newDistrict();
  function rootPageHide(){addEventListener('pagehide',()=>{if(!U.suspend())checkpoint();});}
  // Read-only state for the isolated browser check, not used by the main game.
  if(!C.requested)globalThis.CityCourierPreview=Object.freeze({snapshot:()=>{const runner=U.snapshot();return structuredClone({map,route,mode:runner?.status==='won'?'done':runner?.status==='lost'?'lost':mode,runner,delivered:runner?.delivered||[],spent:runner?runner.completedCost+runner.hits:0});}});
})();
