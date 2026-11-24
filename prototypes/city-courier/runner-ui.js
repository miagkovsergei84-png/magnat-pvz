'use strict';
(function(root){
  const R=root.CourierRunner,V=root.CourierRunnerView,I=root.CourierText,L=I.choose,C=root.CourierCampaign,K=root.CourierCheckpoint,el=id=>document.getElementById(id),screen=el('runner-screen'),canvas=el('runner-world'),overlay=el('runner-overlay');
  const crossingCounter=el('runner-crossings'),score=el('runner-score'),road=el('runner-road'),hearts=el('runner-hearts'),heartSlots=[...hearts.querySelectorAll('span')],progress=el('runner-progress'),progressBar=progress.firstElementChild,pauseButton=el('runner-pause'),commands=[...screen.querySelectorAll('[data-run-command]')];
  let game=null,map=null,route=null,back=null,frame=null,last=0,gesture=null,routeReady=false,loadFailed=false;
  let options=null,seed=null,lastSave=0,waiting=false;
  const hud={},motion=root.CourierMotionClock.create();
  // streetIndex is the number of completed transitions; it advances upon
  // arrival at the intersection, before any parcel handoff starts.
  function passedCrossings(){return Math.min(game.streetIndex,game.program.streets.length);}
  function updateHud(){
    const total=game.program.streets.length,passed=passedCrossings(),percent=Math.floor(game.distance/game.program.total*100),delivered=game.delivered.length,status=game.status;
    if(hud.delivered!==delivered){hud.delivered=delivered;score.textContent=delivered+'/4';}
    const stop=game.handoff?.stop??null;if(hud.stop!==stop||hud.speed!==delivered){hud.stop=stop;hud.speed=delivered;road.textContent=stop===null?L('Темп: ','Speed: ')+Math.round(R.factor(game)*100)+'%':L('ПВЗ ','Pickup ')+I.stop(game.program.stops.indexOf(stop))+L(' • передача',' • handing over');}
    if(hud.passed!==passed||hud.total!==total){hud.passed=passed;hud.total=total;crossingCounter.textContent=`${passed}/${total}`;crossingCounter.setAttribute('aria-label',L(`Пройдено перекрёстков: ${passed} из ${total}`,`Crossings passed: ${passed} of ${total}`));}
    if(hud.lives!==game.lives){hud.lives=game.lives;hearts.setAttribute('aria-label',L(`Жизни: ${game.lives} из ${R.MAX_LIVES}`,`Lives: ${game.lives} of ${R.MAX_LIVES}`));heartSlots.forEach((h,i)=>h.classList.toggle('empty',i>=game.lives));}
    if(hud.percent!==percent){hud.percent=percent;progress.setAttribute('aria-valuenow',String(percent));progressBar.style.transform=`scaleX(${percent/100})`;}
    if(hud.status!==status){hud.status=status;pauseButton.disabled=status!=='play'&&status!=='handoff'&&status!=='paused';pauseButton.textContent=status==='paused'?'▶':'Ⅱ';pauseButton.setAttribute('aria-label',status==='paused'?L('Продолжить','Resume'):L('Пауза','Pause'));commands.forEach(b=>{b.disabled=status!=='play';});}
  }
  function panel(title,text,primary,tips=false){el('runner-title').textContent=title;el('runner-text').textContent=text;el('runner-primary').textContent=primary;el('runner-tips').hidden=!tips;overlay.hidden=false;}
  function ready(){
    const busy=game.program.streets.filter(s=>s.busy).length,count=game.program.streets.length;
    panel(L('На старт!','Ready to run!'),L(`Перекрёстков: ${count}, участков с пробками: ${busy}. Доставь 4 посылки. После каждой передачи темп растёт. У тебя 5 жизней.`,`Crossings: ${count}, busy streets: ${busy}. Deliver 4 parcels. You speed up after each handoff. You have 5 lives.`),L('Бежать','Run'),true);
  }
  function result(){
    const crossings=L('Перекрёстки: ','Crossings: ')+`${passedCrossings()}/${game.program.streets.length}.`;
    if(game.status==='won'){
      const p=game.program.plan,actual=p+game.hits,onTime=actual<=game.program.target;
      const verdict=onTime?L('Успели вовремя!','On time!'):L('Можно построить маршрут быстрее.','A shorter route could be faster.');
      panel(L('Доставка завершена!','Delivery complete!'),L(`Посылки: 4/4. ${crossings} План — ${p} мин, с задержками — ${actual} мин. Осталось жизней: ${game.lives}.`,`Parcels: 4/4. ${crossings} Planned: ${p} min, with delays: ${actual} min. Lives left: ${game.lives}.`)+' '+verdict,options?L('Далее','Continue'):L('Повторить маршрут','Retry route'));
    }else panel(L('Нужна передышка','Take a breather'),L(`Посылки доставлены: ${game.delivered.length}/4. ${crossings} Попробуй ещё раз — маршрут сохранён, препятствия будут другими.`,`Parcels delivered: ${game.delivered.length}/4. ${crossings} Try again. Your route is saved, but the obstacles will change.`),L('Повторить маршрут','Retry route'));
  }
  function present(){
    if(game.status==='paused')panel(L('Пауза','Paused'),L(`Доставлено: ${game.delivered.length}/4. Осталось жизней: ${game.lives}.`,`Delivered: ${game.delivered.length}/4. Lives left: ${game.lives}.`),L('Продолжить','Resume'));
    else if(game.status==='won'||game.status==='lost')result();
    else if(game.status==='ready')ready();
    else overlay.hidden=true;
    const primary=el('runner-primary'),returnButton=el('runner-back'),exit=el('runner-exit');
    primary.disabled=waiting||!routeReady;returnButton.disabled=exit.disabled=waiting;
    returnButton.hidden=!!options&&game.status==='won';exit.hidden=!options;
    returnButton.textContent=options&&game.status==='paused'?L('К плану, начать заново','Replan and restart'):L('К маршруту','Back to route');
    if(!routeReady){
      primary.textContent=loadFailed?L('Ошибка загрузки','Loading failed'):L('Загружаем город…','Loading the city…');
      if(loadFailed)el('runner-text').textContent=L('Не удалось загрузить рисунки. Вернись к карте и обнови страницу.','Couldn’t load the artwork. Go back to the map and reload.');
    }
  }
  function emitCheckpoint(){if(options){lastSave=game.elapsed;options.onCheckpoint();}}
  function maybeSave(status,lives,delivered){
    if(!options)return;
    if(game.status!==status||game.lives!==lives||game.delivered.length!==delivered){emitCheckpoint();return;}
    // Ordinary saves are throttled and stay outside the visual stitch.
    if(game.elapsed-lastSave>=3&&!root.CourierStreetVisuals.frame(game.program.visualPlan,game.distance,game.streetIndex,!!game.handoff).to)emitCheckpoint();
  }
  function runFrame(now){if(!game||screen.hidden){frame=null;return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(['play','handoff'].includes(game.status)){
      const status=game.status,lives=game.lives,delivered=game.delivered.length;
      R.advance(game,motion.step(dt,game,R.speed(game)));updateHud();V.draw(canvas,game);
      C.setDelivered(game.delivered.length);
      if(['won','lost'].includes(game.status)){C.setPlaying(false);present();}
      maybeSave(status,lives,delivered);
    }
    frame=requestAnimationFrame(runFrame);
  }
  function draw(){updateHud();V.draw(canvas,game);}
  function reset(savedState=null){
    if(savedState){seed=savedState.runner.seed;game=K.restore(savedState);}
    else if(options){seed=Math.floor(Math.random()*4294967296);game=R.create(K.build(map,route,seed));}
    else game=R.create(R.compile(map,route));
    motion.reset();gesture=null;routeReady=false;loadFailed=false;waiting=false;
    present();draw();emitCheckpoint();
    const pending=game;
    Promise.resolve().then(()=>V.prepareRoute?V.prepareRoute(pending.program,pending.streetIndex):V.ready).then(()=>{
      if(game!==pending)return;routeReady=true;present();draw();
    }).catch(()=>{
      if(game!==pending)return;loadFailed=true;present();
    });
  }
  function open(district,plan,onBack,campaign=null){map=district;route=plan.slice();back=onBack;options=campaign;el('planner').hidden=true;screen.hidden=false;document.body.classList.add('runner-mode');reset(campaign?.savedState);last=0;if(frame===null)frame=requestAnimationFrame(runFrame);}
  function close(){if(!game||waiting)return;C.setPlaying(false);gesture=null;game=null;map=null;route=null;options=null;seed=null;routeReady=false;motion.reset();if(frame!==null){cancelAnimationFrame(frame);frame=null;}V.releaseRoute?.();screen.hidden=true;document.body.classList.remove('runner-mode');el('planner').hidden=false;const cb=back;back=null;cb?.();}
  function start(){if(!game||waiting||!routeReady||V.isReady&&!V.isReady())return;if(R.start(game)){C.setDelivered(game.delivered.length);C.setPlaying(true);last=0;motion.reset();present();draw();emitCheckpoint();canvas.focus({preventScroll:true});}}
  function suspend(){if(!game||!R.pause(game))return false;C.setPlaying(false);gesture=null;present();draw();emitCheckpoint();return true;}
  function pause(){if(!game||waiting)return;if(game.status==='paused')start();else suspend();}
  function refresh(){if(game){Object.keys(hud).forEach(k=>delete hud[k]);present();draw();}}
  function setWaiting(value){waiting=value;if(game)present();}
  function act(cmd){return game?R.command(game,cmd):false;}
  // A mobile browser can suppress the synthetic click immediately after a
  // rapid canvas swipe. Handle a genuine short touch directly, while retaining
  // ordinary click/keyboard activation and suppressing its duplicate click.
  function bindButton(button,action){let touch=null,lastTouch=-Infinity;
    button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!button.disabled)touch={id:e.pointerId,x:e.clientX,y:e.clientY};});
    button.addEventListener('pointercancel',()=>{touch=null;});
    button.addEventListener('pointerup',e=>{if(!touch||touch.id!==e.pointerId)return;const start=touch;touch=null;const b=button.getBoundingClientRect();if(button.disabled||Math.hypot(e.clientX-start.x,e.clientY-start.y)>18||e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)return;lastTouch=performance.now();e.preventDefault();action();});
    button.addEventListener('click',e=>{if(button.disabled)return;if(performance.now()-lastTouch<700&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents||e.detail>0)){e.preventDefault();return;}action();});
  }
  bindButton(el('runner-primary'),()=>{
    if(!game||waiting)return;
    if(options&&game.status==='won'){if(game.delivered.length===4)options.onComplete();return;}
    if(['won','lost'].includes(game.status)){reset();return;}
    start();
  });
  bindButton(el('runner-back'),close);bindButton(el('runner-pause'),pause);bindButton(el('runner-exit'),()=>options?.onExit());
  screen.querySelectorAll('[data-run-command]').forEach(b=>bindButton(b,()=>act(b.dataset.runCommand)));
  canvas.addEventListener('pointerdown',e=>{if(game?.status!=='play'||gesture||e.button!==0)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch{}e.preventDefault();});
  canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;try{canvas.releasePointerCapture(e.pointerId);}catch{}const threshold=Math.max(20,canvas.clientWidth*.065);if(Math.max(Math.abs(dx),Math.abs(dy))>=threshold)act(Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'jump':'slide');e.preventDefault();});
  for(const t of ['pointercancel','lostpointercapture'])canvas.addEventListener(t,e=>{if(gesture?.id===e.pointerId)gesture=null;});
  window.addEventListener('keydown',e=>{if(screen.hidden||e.repeat)return;const key=e.key.toLowerCase(),cmd=({arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'jump',w:'jump',' ':'jump',arrowdown:'slide',s:'slide'})[key];if(cmd&&game?.status==='play'){e.preventDefault();act(cmd);}else if(key==='escape'||key==='p'){e.preventDefault();pause();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
  root.CourierRunnerUI=Object.freeze({open,close,suspend,refresh,setWaiting,checkpoint:()=>options&&game?K.capture(game,seed):null,snapshot:()=>game?structuredClone(game):null});
})(globalThis);
