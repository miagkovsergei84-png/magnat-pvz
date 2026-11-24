(() => {
  'use strict';
  const query=new URLSearchParams(globalThis.location?.search||'');
  const campaignMode=query.get('campaign')==='1',lang=query.get('lang')==='en'?'en':'ru',L=(ru,en)=>lang==='en'?en:ru;
  const requestedEpisode=Math.max(0,Math.min(2,Number(query.get('episode'))||0));
  let restorePending=campaignMode&&query.get('restore')==='1',lastCheckpoint=-Infinity;
  const W=360,H=640,step=10,radius=10;
  const MAX_LIVES=5;
  const FLASH_RADIUS=94,FLASH_BLIND=4,FLASH_COOLDOWN=6,FLASH_PULSE=.45;
  const LIGHT_RADIUS=82,DUST_RADIUS=64,PLAYER_SPEED=102,DUST_SPEED_MULTIPLIER=.7;
  const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
  const el=id=>document.getElementById(id);
  const load=path=>{const image=new Image();image.src=path;return image;};
  const boards=['../../assets/campaign/town/basement-board.webp','../../assets/campaign/town/basement-warehouse.webp','../../assets/campaign/town/basement-packing.webp'].map(load),sprites=load('../../assets/campaign/town/basement-sprites.webp');
  const front=load('../../assets/characters-webp/player-actions-a.webp');
  const rear=load('../../assets/characters-webp/rear-actions-uniform-a.webp');
  const meta=PptCharacterAtlases['uniform-a'];
  // The solid footprints match the painted stairway and central shelf.
  const stairs={x:30,y:0,w:71,h:72};
  const episodes=[
    {name:L('Коридор подвала','Basement corridor'),hudName:L('Коридор','Corridor'),title:L('Беспокойные посылки','Restless parcels'),count:5,boxes:3,mice:0,moths:0,mimics:0,
      obstacles:[stairs,{x:124,y:181,w:112,h:176}],lamps:[],
      intro:L('Верни 5 посылок в зону сортировки. Избегай озорных коробок.','Bring 5 parcels to the sorting area. Avoid mischievous boxes.'),
      tips:[L('Коснись пола или посылки со звёздочками, чтобы идти.','Tap the floor or a sparkling parcel to move.'),L('Столкновение с озорником отнимает 1 жизнь.','A collision costs one life.'),L('Вспышка: 4 с ослепления, 6 с зарядки.','Flash: 4 s dazzle, 6 s recharge.')]},
    {name:L('Старый склад','Old storeroom'),hudName:L('Склад','Storeroom'),title:L('Мышиная возня','Mouse mischief'),count:7,boxes:2,mice:1,moths:1,mimics:0,
      obstacles:[stairs,{x:30,y:202,w:140,h:79},{x:185,y:332,w:145,h:79}],
      lamps:[{x:283,y:128},{x:72,y:440},{x:72,y:136},{x:225,y:307}],
      intro:L('Верни 7 посылок. Мышь крадёт их, моль мешает.','Rescue 7 parcels. A mouse steals them and a moth gets in your way.'),
      tips:[L('Вспышка заставляет мышь бросить добычу.','A flash makes the mouse drop its parcel.'),L('Пыль маскирует коробки и замедляет на 30%.','Dust disguises boxes and slows you by 30%.'),L('Включай лампы, чтобы защититься от моли.','Switch on lamps to repel the moth.')]},
    {name:L('Упаковочная','Packing room'),hudName:L('Упаковочная','Packing room'),title:L('Коробки с секретом','Boxes with secrets'),count:9,boxes:2,mice:1,moths:1,mimics:2,
      obstacles:[stairs,{x:118,y:184,w:124,h:88},{x:30,y:332,w:104,h:79},{x:226,y:332,w:104,h:79}],
      lamps:[{x:65,y:290},{x:287,y:450},{x:180,y:112},{x:285,y:290}],
      intro:L('Спаси 9 посылок. Мимики оживают рядом с героем.','Save 9 parcels. Mimics wake up when you approach.'),
      tips:[L('В пыли озорники похожи на обычные посылки.','In dust, tricksters look like regular parcels.'),L('Свет защищает от моли и замедления.','Light repels the moth and restores speed.'),L('Вспышка: 4 с ослепления, 6 с зарядки.','Flash: 4 s dazzle, 6 s recharge.')]}
  ];
  let episode=0,level=episodes[0],targetCount=level.count,obstacles=level.obstacles;
  const safe={x:34,y:505,w:292,h:83};
  const origin={x:180,y:555};
  const spawnPoints=[
    {x:72,y:128},{x:154,y:127},{x:260,y:85},{x:287,y:152},{x:73,y:269},
    {x:74,y:389},{x:284,y:263},{x:284,y:384},{x:147,y:421},{x:245,y:449}
  ];
  const patrols=[
    [{x:60,y:183},{x:60,y:416},{x:157,y:430},{x:112,y:121}],
    [{x:290,y:140},{x:290,y:402},{x:240,y:445},{x:287,y:223}],
    [{x:152,y:86},{x:285,y:110},{x:275,y:180},{x:95,y:150}]
  ];
  const parcelPatrol=[
    {x:65,y:112},{x:175,y:104},{x:284,y:104},{x:295,y:187},
    {x:284,y:317},{x:280,y:442},{x:178,y:463},{x:66,y:438},
    {x:65,y:310},{x:66,y:204}
  ];
  let status='intro',elapsed=0,score=0,lives=MAX_LIVES,player,parcels,enemies,lamps,route=[],followId=null,retarget=0;
  let help=false;
  let keys=new Set(),cooldown=0,shield=0,effect=0,notice=0,flashAt=null,lastFlashHits=[];
  let audio=null,muted=false;
  const audioPrefs={musicMuted:query.get('musicMuted')==='1',sfxMuted:query.get('sfxMuted')==='1',musicVolume:query.has('musicVolume')?Math.max(0,Math.min(1,Number(query.get('musicVolume'))||0)):.3,sfxVolume:query.has('sfxVolume')?Math.max(0,Math.min(1,Number(query.get('sfxVolume'))||0)):.55};
  let externalHold=false;
  const ready=image=>image.complete&&image.naturalWidth>0;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const inSafe=p=>p.x>safe.x+5&&p.x<safe.x+safe.w-5&&p.y>safe.y+5&&p.y<safe.y+safe.h-5;
  const clip=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  function free(x,y,r=radius){
    if(x<33+r||x>327-r||y<41+r||y>590-r)return false;
    return !obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);
  }
  function crossesRect(a,b,o,padding=0){
    // Test the continuous segment, not spaced samples: a shallow diagonal
    // can otherwise clip a shelf corner between samples and get stuck.
    let enter=0,exit=1;
    for(const [key,size] of [['x','w'],['y','h']]){
      const lo=o[key]-padding,hi=o[key]+o[size]+padding,d=b[key]-a[key];
      if(Math.abs(d)<1e-9){if(a[key]<=lo||a[key]>=hi)return false;continue;}
      const t0=(lo-a[key])/d,t1=(hi-a[key])/d;
      enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));
      if(enter>=exit)return false;
    }
    return true;
  }
  function segmentDistance(a,b,p){
    const dx=b.x-a.x,dy=b.y-a.y,dd=dx*dx+dy*dy;
    const t=dd?clip(((p.x-a.x)*dx+(p.y-a.y)*dy)/dd,0,1):0;
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  }
  function lineFree(a,b,avoidLight=false){
    if(!free(a.x,a.y)||!free(b.x,b.y)||obstacles.some(o=>crossesRect(a,b,o,radius)))return false;
    if(avoidLight&&(inLight(a)||inLight(b)||crossesRect(a,b,{x:safe.x+5,y:safe.y+5,w:safe.w-10,h:safe.h-10})||lamps.some(l=>l.lit&&segmentDistance(a,b,l)<LIGHT_RADIUS)))return false;
    return true;
  }
  const cols=W/step,rows=H/step;
  const grid=Array.from({length:cols*rows},(_,i)=>({x:i%cols*step+step/2,y:Math.floor(i/cols)*step+step/2}));
  let walkable=grid.map(p=>free(p.x,p.y,radius+1));
  function nearest(p,visible=false,avoidLight=false){
    let index=-1,best=Infinity;
    grid.forEach((q,i)=>{
      if(!walkable[i]||(avoidLight&&inLight(q)))return;
      const d=dist(p,q);
      if(d<best&&(!visible||lineFree(p,q,avoidLight))){best=d;index=i;}
    });
    return index;
  }
  function pathTo(start,destination,avoidLight=false){
    const goal=free(destination.x,destination.y)&&(!avoidLight||!inLight(destination))?{x:destination.x,y:destination.y}:grid[nearest(destination,false,avoidLight)];
    if(!goal)return [];
    if(lineFree(start,goal,avoidLight))return [goal];
    const from=nearest(start,true,avoidLight),to=nearest(goal,true,avoidLight);
    if(from<0||to<0)return [];
    const previous=new Int16Array(grid.length);previous.fill(-1);previous[from]=from;
    const queue=[from];
    for(let head=0;head<queue.length&&previous[to]===-1;head++){
      const i=queue[head],x=i%cols,y=Math.floor(i/cols);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,j=ny*cols+nx;
        if(nx<0||nx>=cols||ny<0||ny>=rows||!walkable[j]||previous[j]>=0||(avoidLight&&!lineFree(grid[i],grid[j],true)))continue;
        previous[j]=i;queue.push(j);
      }
    }
    if(previous[to]===-1)return [];
    const path=[];
    for(let i=to;i!==from;i=previous[i])path.push(grid[i]);
    path.push(grid[from]);path.reverse();
    if(lineFree(grid[to],goal,avoidLight))path.push(goal);
    // Merge visible segments so touch movement does not look grid-bound.
    const smooth=[];let anchor=start,i=0;
    while(i<path.length){
      let j=path.length-1;
      while(j>i&&!lineFree(anchor,path[j],avoidLight))j--;
      smooth.push(path[j]);anchor=path[j];i=j+1;
    }
    return smooth;
  }
  function shuffle(items){
    const result=items.slice();
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function roomPoints(){
    const points=[];
    for(let y=105;y<=465;y+=60)for(let x=60;x<=300;x+=60){
      if(free(x,y,radius+5))points.push({x,y});
    }
    return points;
  }
  function makeActor(kind,points,id,initial,speed){
    return {...initial,id,kind,points,idx:1,speed,path:[],wait:0,stun:0,facing:1,chasing:false,
      stolen:null,stealTime:0,rest:0,state:kind==='mimic'?'sleeping':'active',wake:0,activeFor:0,targetId:null,fleeing:false};
  }
  function reset(){
    elapsed=score=cooldown=shield=effect=notice=0;
    lives=MAX_LIVES;
    flashAt=null;lastFlashHits=[];
    player={...origin,carry:null,facing:'front',moving:false,flip:false};
    const available=roomPoints(),spawns=shuffle(episode===0?spawnPoints:available);
    const loop=episode===0?parcelPatrol:shuffle(available);
    parcels=spawns.slice(0,targetCount).map((p,id)=>{
      const points=id%2?loop.slice().reverse():loop;
      const near=points.reduce((best,q,i)=>dist(p,q)<dist(p,points[best])?i:best,0);
      return {...p,id,delivered:false,points,idx:(near+1+id%3)%points.length,speed:[31,27,35,29,33][id%5],path:[],facing:1,mouseId:null,protectedFor:0};
    });
    const actorStarts=episode===0?null:spawns.slice(targetCount);
    enemies=[];
    const add=(kind,speed)=>{
      const id=enemies.length,points=episode===0?patrols[id]:shuffle(available);
      const initial=episode===0?points[0]:(actorStarts[id]||points[0]);
      enemies.push(makeActor(kind,points,id,initial,speed));
    };
    for(let i=0;i<level.boxes;i++)add('box',[48,43,50][i]);
    for(let i=0;i<level.mice;i++)add('mouse',53);
    for(let i=0;i<level.moths;i++)add('moth',52);
    for(let i=0;i<level.mimics;i++)add('mimic',52);
    lamps=level.lamps.map(p=>({...p,lit:false}));
    route=[];followId=null;retarget=0;keys.clear();
    el('time').textContent='0:00';el('flash').disabled=false;el('flash-state').textContent=L('Готово','Ready');
    hud(L('Собери посылки: ','Rescue parcels: ')+targetCount);
  }
  function checkpoint(){
    if(!campaignMode||restorePending||!player)return;
    const patrol=a=>({x:a.x,y:a.y,id:a.id,points:a.points.map(p=>({x:p.x,y:p.y})),idx:a.idx,speed:a.speed,facing:a.facing});
    const data={version:1,episode,status,score,lives,elapsed,cooldown,shield,help,
      player:{x:player.x,y:player.y,facing:player.facing,flip:player.flip,carryId:player.carry?.id??null},
      parcels:parcels.map(p=>({...patrol(p),delivered:p.delivered,mouseId:p.mouseId,protectedFor:p.protectedFor})),
      enemies:enemies.map(e=>({...patrol(e),kind:e.kind,state:e.state,stun:e.stun,rest:Math.max(0,e.rest),stealTime:Math.max(0,e.stealTime),wake:Math.max(0,e.wake),activeFor:Math.max(0,e.activeFor),stolen:e.stolen})),
      lampLit:lamps.map(l=>l.lit)};
    lastCheckpoint=elapsed;globalThis.parent.postMessage({type:'ppt-town-basement-checkpoint',episode,data},location.origin==='null'?'*':location.origin);
  }
  function restoreCheckpoint(data){
    if(!restorePending||data?.episode!==episode)return;
    restorePending=false;
    if(data.version!==1||data.parcels?.length!==targetCount||data.enemies?.length!==enemies.length||!free(data.player.x,data.player.y)){checkpoint();return;}
    elapsed=data.elapsed;score=data.score;lives=data.lives;cooldown=data.cooldown;shield=data.shield;help=data.help;
    parcels=data.parcels.map(p=>({...p,path:[]}));enemies=data.enemies.map(e=>({...e,path:[],wait:0,chasing:false,targetId:null,fleeing:false}));
    player={x:data.player.x,y:data.player.y,facing:data.player.facing,flip:data.player.flip,moving:false,carry:data.player.carryId===null?null:parcels[data.player.carryId]};
    lamps.forEach((l,i)=>l.lit=data.lampLit[i]);route=[];followId=null;keys.clear();lastCheckpoint=elapsed;
    hud(L('Собери посылки: ','Rescue parcels: ')+targetCount);el('time').textContent=formatTime(elapsed);
    el('flash-state').textContent=cooldown>0?cooldown.toFixed(1)+L(' с',' s'):L('Готово','Ready');
    if(data.status==='won'){finish(false);return;}if(data.status==='lost'){lose(false);return;}
    if(data.status==='intro'){status='intro';overlay(level.title,level.intro,L('Начать','Start'),true);return;}
    status='paused';el('pause').disabled=false;el('pause').textContent='▶';el('flash').disabled=cooldown>0;
    overlay(L('Продолжим?','Continue?'),L('Попытка восстановлена: посылки и жизни сохранены.','Your attempt was restored, including parcels and lives.'),L('Продолжить','Continue'),false,true);
  }
  function selectEpisode(index){
    episode=index;level=episodes[episode];targetCount=level.count;obstacles=level.obstacles;
    walkable=grid.map(p=>free(p.x,p.y,radius+1));
    el('room-title').textContent=level.hudName;
    el('room-title').title=level.name;
    el('episode-name').textContent=L('Городок · Эпизод ','Town · Episode ')+(episode+1)+L(' из ',' of ')+episodes.length;
    el('instructions').replaceChildren(...level.tips.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
    el('episode-picker').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===episode)));
    reset();status='intro';el('pause').textContent='Ⅱ';el('pause').disabled=true;el('flash').disabled=true;
    overlay(level.title,level.intro,L('Начать','Start'),true);
  }
  function hud(message){
    el('score').textContent=score+'/'+targetCount;
    livesHud();
    if(message){el('message').textContent=message;notice=3.2;}
  }
  function livesHud(){
    const row=el('lives');row.setAttribute('aria-label',L('Жизни: ','Lives: ')+lives+L(' из ',' of ')+MAX_LIVES);
    row.querySelectorAll('svg').forEach((heart,i)=>heart.classList.toggle('empty',i>=lives));
  }
  function overlay(title,text,action,showInstructions=false,canRestart=false){
    el('overlayTitle').textContent=title;el('overlayText').textContent=text;
    el('instructions').hidden=!showInstructions;el('primary').textContent=action;
    el('restart').hidden=!canRestart;el('restart').textContent=status==='won'?L('Повторить эпизод','Replay episode'):L('Начать заново','Restart');el('overlay').hidden=false;
    el('help-option').hidden=!showInstructions&&status!=='lost';
    el('help-toggle').checked=help;
  }
  function start(newRun=false){
    if(externalHold||restorePending)return;
    if(newRun)reset();
    status='play';keys.clear();el('overlay').hidden=true;el('pause').textContent='Ⅱ';el('pause').disabled=false;el('flash').disabled=cooldown>0;
    unlockSound();canvas.focus({preventScroll:true});checkpoint();
  }
  function pause(){
    if(status==='play'){
      status='paused';keys.clear();el('pause').textContent='▶';
      overlay(L('Пауза','Paused'),L('Посылки и коробки подождут.','The parcels can wait.'),L('Продолжить','Continue'),false,true);
      checkpoint();
    }else if(status==='paused')start();
  }
  function finish(persist=true){
    status='won';route=[];keys.clear();
    el('time').textContent=formatTime(elapsed);el('pause').disabled=true;el('flash').disabled=true;
    const lastEpisode=episode===episodes.length-1;
    overlay(lastEpisode?L('Подвал расчищен!','Basement cleared!'):L('Комната расчищена!','Room cleared!'), L('Посылки спасены: ','Parcels rescued: ')+score+'/'+targetCount+L('. Время — ','. Time — ')+formatTime(elapsed)+'.',campaignMode?L('Продолжить','Continue'):lastEpisode?L('Сыграть сначала','Play again'):L('Дальше: ','Next: ')+episodes[episode+1].name,false,!campaignMode);
    cue(780,.28);if(persist)checkpoint();
  }
  function lose(persist=true){
    status='lost';route=[];followId=null;keys.clear();effect=0;
    el('time').textContent=formatTime(elapsed);el('pause').disabled=true;el('flash').disabled=true;
    hud(L('Жизни закончились','No lives left'));
    overlay(L('Жизни закончились','No lives left'),L('Спасено '+score+' из '+targetCount+' посылок. Повтори этот эпизод с пятью жизнями.','Saved '+score+' of '+targetCount+' parcels. Retry with five lives.'),L('Повторить эпизод','Retry episode'));
    if(persist)checkpoint();
  }
  function formatTime(seconds){
    const n=Math.floor(seconds);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
  }
  function tell(text){hud(text);}
  function moveToward(actor,target,speed,dt){
    const dx=target.x-actor.x,dy=target.y-actor.y,d=Math.hypot(dx,dy);
    if(d<.2)return true;
    const n=Math.min(d,speed*dt),x=actor.x+dx*n/d,y=actor.y+dy*n/d;
    if(!free(x,y))return false;
    actor.x=x;actor.y=y;
    if(actor===player){player.moving=true;if(Math.abs(dy)>.35)player.facing=dy<0?'rear':'front';if(Math.abs(dx)>.4)player.flip=dx<0;}
    else if(Math.abs(dx)>.2)actor.facing=dx<0?-1:1;
    return d<=n+.1;
  }
  function walkRoute(actor,path,speed,dt){
    if(!path.length)return;
    const x=actor.x,y=actor.y;
    if(moveToward(actor,path[0],speed,dt))path.shift();
    else if(actor.x===x&&actor.y===y)path.length=0;
  }
  function planPatrol(actor){
    // Pick a different reachable destination on arrival or if an old route
    // was blocked. No unstunned box should camp at a dead end.
    for(let attempt=0;attempt<actor.points.length;attempt++){
      const target=actor.points[actor.idx];
      actor.idx=(actor.idx+1)%actor.points.length;
      if(dist(actor,target)<18)continue;
      actor.path=pathTo(actor,target);
      if(actor.path.length)return;
    }
  }
  function roam(actor,dt,speed=actor.speed){
    if(!actor.path.length)planPatrol(actor);
    walkRoute(actor,actor.path,speed,dt);
  }
  function directional(dt){
    const dx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
    const dy=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
    if(!dx&&!dy)return false;
    route=[];followId=null;const speed=playerSpeed();let length=Math.hypot(dx,dy),vx=dx/length*speed*dt,vy=dy/length*speed*dt;
    if(free(player.x+vx,player.y))player.x+=vx;
    if(free(player.x,player.y+vy))player.y+=vy;
    player.moving=true;if(dy)player.facing=dy<0?'rear':'front';if(dx)player.flip=dx<0;
    return true;
  }
  function useFlash(){
    if(status!=='play'||cooldown>0)return;
    const blinded=enemies.filter(e=>dist(player,e)<=FLASH_RADIUS&&lineFree(player,e));
    effect=FLASH_PULSE;flashAt={x:player.x,y:player.y,phoneX:player.x+(player.flip&&player.facing==='front'?11:-11),phoneY:player.y-27};cooldown=FLASH_COOLDOWN;lastFlashHits=blinded.map(e=>e.id);
    el('flash').disabled=true;el('flash-state').textContent=L('6.0 с','6.0 s');
    cue(960,.07,.044);cue(350,.09,.025,.045);
    if(!blinded.length){tell(L('Вспышка! Рядом никого.','Flash! Nobody nearby.'));checkpoint();return;}
    for(const enemy of blinded){
      enemy.stun=FLASH_BLIND;enemy.path=[];enemy.wait=0;enemy.targetId=null;enemy.chasing=false;
      if(enemy.kind==='mouse')releaseStolen(enemy);
      if(enemy.kind==='mimic'){enemy.state='active';enemy.activeFor=8;enemy.wake=0;}
    }
    tell(L('Ослеплено: ','Dazzled: ')+blinded.length+L(' · 4 с',' · 4 s')+(blinded.some(e=>e.kind==='moth')?L(' · пыль осела!',' · dust cleared!'):''));
    checkpoint();
  }
  function bump(enemy){
    if(status!=='play'||shield>0||inSafe(player))return;
    lives=Math.max(0,lives-1);
    if(player.carry){
      player.carry.x=player.x;player.carry.y=player.y;player.carry.path=[];player.carry.protectedFor=4;player.carry=null;
      tell(L('−1 жизнь. Посылка упала!','−1 life. Parcel dropped!'));
    }else tell(L('−1 жизнь. Осталось: ','−1 life. Remaining: ')+lives);
    Object.assign(player,origin,{moving:false,facing:'front'});
    route=[];followId=null;shield=2.4;enemy.path=[];enemy.chasing=false;enemy.wait=0;cue(170,.22);
    if(lives===0)lose();else checkpoint();
  }
  function releaseStolen(mouse){
    if(mouse.stolen===null)return;
    const parcel=parcels.find(p=>p.id===mouse.stolen);
    if(parcel){parcel.mouseId=null;parcel.x=mouse.x;parcel.y=mouse.y;parcel.path=[];parcel.protectedFor=6;}
    mouse.stolen=null;mouse.stealTime=0;mouse.rest=4;mouse.path=[];mouse.wait=0;
  }
  function updateMouse(mouse,dt){
    mouse.rest=Math.max(0,mouse.rest-dt);mouse.wait-=dt;
    const speed=mouse.speed*(help ? .72 : 1);
    if(mouse.stolen!==null){
      mouse.stealTime-=dt;
      if(mouse.stealTime<=0){releaseStolen(mouse);tell(L('Мышь бросила посылку!','The mouse dropped a parcel!'));return;}
      roam(mouse,dt,speed);
      const parcel=parcels.find(p=>p.id===mouse.stolen);
      if(parcel){parcel.x=mouse.x;parcel.y=mouse.y;}
      return;
    }
    const target=mouse.rest<=0?parcels.filter(p=>!p.delivered&&p!==player.carry&&p.mouseId===null&&p.protectedFor<=0&&!inSafe(p))
      .sort((a,b)=>dist(mouse,a)-dist(mouse,b))[0]:null;
    if(target){
      if(mouse.wait<=0||!mouse.path.length){mouse.path=pathTo(mouse,target);mouse.wait=.5;}
      walkRoute(mouse,mouse.path,speed,dt);
      if(dist(mouse,target)<19&&lineFree(mouse,target)){
        mouse.stolen=target.id;target.mouseId=mouse.id;target.x=mouse.x;target.y=mouse.y;target.path=[];
        mouse.stealTime=help?2.5:4.5;mouse.path=[];
        const hideout=mouse.points.filter(p=>dist(p,mouse)>70).sort((a,b)=>dist(b,player)-dist(a,player))[0];
        if(hideout)mouse.path=pathTo(mouse,hideout);
        tell(L('Мышь утащила посылку!','The mouse stole a parcel!'));cue(355,.12);
      }
    }else roam(mouse,dt,speed);
  }
  function inLight(point){return inSafe(point)||lamps.some(l=>l.lit&&dist(l,point)<LIGHT_RADIUS);}
  function dustAt(point){
    return !inLight(point)&&enemies.some(m=>m.kind==='moth'&&m.stun<=0&&!inLight(m)&&dist(m,point)<DUST_RADIUS&&lineFree(m,point));
  }
  function playerSpeed(){return PLAYER_SPEED*(dustAt(player)?DUST_SPEED_MULTIPLIER:1);}
  function isObscured(parcel){
    return !parcel.delivered&&parcel!==player.carry&&dustAt(parcel);
  }
  function isMaskedEnemy(enemy){
    return (enemy.kind==='box'||enemy.kind==='mimic')&&enemy.stun<=0&&dustAt(enemy);
  }
  function enemyBoxSprite(enemy){
    // The flash dazzles the box; it is not tied with packing tape.
    if(enemy.stun>0)return 1;
    return isMaskedEnemy(enemy)||(enemy.kind==='mimic'&&enemy.state==='sleeping')?0:1;
  }
  function updateMoth(moth,dt){
    const speed=moth.speed*(help ? .72 : 1);
    moth.wait-=dt;
    if(inLight(moth)){
      // A newly lit lamp immediately disables the dust and sends the moth
      // out of the protected area. It may traverse light only to get out.
      if(!moth.fleeing||!moth.path.length||moth.wait<=0){
        moth.fleeing=true;moth.targetId=null;moth.path=[];moth.wait=.4;
        let exits=moth.points.filter(p=>!inLight(p)&&lamps.every(l=>!l.lit||dist(l,p)>LIGHT_RADIUS+12)).sort((a,b)=>dist(moth,a)-dist(moth,b));
        if(!exits.length)exits=grid.filter((p,i)=>walkable[i]&&!inLight(p)).sort((a,b)=>dist(moth,a)-dist(moth,b));
        for(const point of exits){const path=pathTo(moth,point);if(path.length){moth.path=path;break;}}
      }
      walkRoute(moth,moth.path,speed*1.65,dt);return;
    }
    if(moth.fleeing){moth.fleeing=false;moth.path=[];moth.wait=0;}
    if(moth.wait<=0||!moth.path.length){
      moth.path=[];moth.targetId=null;moth.wait=.48;
      const targets=parcels.filter(p=>!p.delivered&&p!==player.carry&&!inLight(p)).sort((a,b)=>dist(moth,a)-dist(moth,b));
      for(const target of targets){
        // Circle a moving target rather than sitting still on top of it.
        const a=elapsed*1.7+moth.id,orbit={x:target.x+Math.cos(a)*24,y:target.y+Math.sin(a)*24};
        const destination=free(orbit.x,orbit.y)&&!inLight(orbit)&&lineFree(orbit,target)?orbit:target;
        const path=pathTo(moth,destination,true);
        if(path.length){moth.path=path;moth.targetId=target.id;break;}
      }
      if(!moth.path.length){
        for(let attempt=0;attempt<moth.points.length;attempt++){
          const point=moth.points[moth.idx];moth.idx=(moth.idx+1)%moth.points.length;
          if(inLight(point)||dist(moth,point)<18)continue;
          const path=pathTo(moth,point,true);if(path.length){moth.path=path;break;}
        }
      }
    }
    walkRoute(moth,moth.path,speed,dt);
  }
  function updateMimic(enemy,dt){
    if(enemy.state==='sleeping'){
      if(!shield&&!inSafe(player)&&dist(enemy,player)<67&&lineFree(enemy,player)){
        enemy.state='warning';enemy.wake=.8;tell(L('Осторожно: мимик просыпается!','Careful: a mimic is waking!'));cue(410,.13);
      }
      return false;
    }
    if(enemy.state==='warning'){
      enemy.wake-=dt;
      if(enemy.wake<=0){enemy.state='active';enemy.activeFor=8;enemy.path=[];enemy.wait=0;}
      return false;
    }
    enemy.activeFor-=dt;
    if(enemy.activeFor<=0&&dist(enemy,player)>105){enemy.state='sleeping';enemy.path=[];enemy.chasing=false;return false;}
    return true;
  }
  function updateEnemies(dt){
    for(const enemy of enemies){
      if(enemy.stun>0){enemy.stun=Math.max(0,enemy.stun-dt);continue;}
      if(enemy.kind==='mouse'){updateMouse(enemy,dt);continue;}
      if(enemy.kind==='moth'){updateMoth(enemy,dt);continue;}
      if(enemy.kind==='mimic'&&!updateMimic(enemy,dt))continue;
      enemy.wait-=dt;
      const pursuit=!shield&&!inSafe(player)&&dist(enemy,player)<140;
      if(pursuit){
        if(!enemy.chasing||enemy.wait<=0||!enemy.path.length){
          enemy.path=pathTo(enemy,player);enemy.wait=.65+enemy.id*.09;
        }
      }else{
        if(enemy.chasing)enemy.path=[];
        if(!enemy.path.length)planPatrol(enemy);
      }
      enemy.chasing=pursuit;
      walkRoute(enemy,enemy.path,enemy.speed*(pursuit?1.15:1)*(help ? .72 : 1),dt);
      if(!shield&&!inSafe(player)&&dist(enemy,player)<18&&lineFree(enemy,player)){bump(enemy);break;}
    }
  }
  function update(dt){
    if(status!=='play')return;
    elapsed+=dt;cooldown=Math.max(0,cooldown-dt);shield=Math.max(0,shield-dt);effect=Math.max(0,effect-dt);
    for(const parcel of parcels){
      parcel.protectedFor=Math.max(0,parcel.protectedFor-dt);
      if(!parcel.delivered&&parcel!==player.carry&&parcel.mouseId===null)roam(parcel,dt);
    }
    player.moving=false;
    if(!directional(dt)){
      const followed=followId===null?null:parcels.find(p=>p.id===followId&&!p.delivered&&!player.carry&&!isObscured(p));
      if(followed){
        retarget-=dt;
        if(retarget<=0||!route.length){route=pathTo(player,followed);retarget=.22;}
      }else if(followId!==null){followId=null;tell(L('Моль спрятала звёздочку! Включи свет.','The moth hid the marker! Switch on a lamp.'));}
      walkRoute(player,route,playerSpeed(),dt);
    }
    if(!player.carry){
      const item=parcels.find(p=>!p.delivered&&dist(p,player)<21&&lineFree(player,p));
      if(item){
        if(item.mouseId!==null)releaseStolen(enemies.find(e=>e.id===item.mouseId));
        player.carry=item;item.path=[];if(followId!==null){route=[];followId=null;}tell(L('Отнеси посылку в светлую зону','Bring the parcel to the sorting area'));cue(530,.14);checkpoint();
      }
    }
    if(player.carry&&inSafe(player)){
      player.carry.delivered=true;player.carry=null;score++;tell(L('Спасено ','Saved ')+score+L(' из ',' of ')+targetCount);cue(800,.16);
      if(score===targetCount){hud();finish();return;}
      checkpoint();
    }
    for(const lamp of lamps)if(!lamp.lit&&dist(player,lamp)<24&&lineFree(player,lamp)){
      lamp.lit=true;
      for(const moth of enemies.filter(e=>e.kind==='moth')){moth.path=[];moth.wait=0;}
      tell(L('Лампа зажжена! Моль держится подальше.','Lamp on! The moth stays away.'));cue(620,.18);
      checkpoint();
    }
    updateEnemies(dt);
    if(status!=='play')return;
    if(notice>0){notice-=dt;if(notice<=0)hud(player.carry?L('Отнеси посылку вниз','Bring the parcel down'):dustAt(player)?L('Пыль: −30% скорости','Dust: −30% speed'):parcels.some(isObscured)?L('Пыль скрыла звёзды — включи свет','Dust hides markers — switch on light'):L('Найди коробки со звёздами','Find sparkling parcels'));}
    el('time').textContent=formatTime(elapsed);
    el('flash').disabled=cooldown>0;el('flash-state').textContent=cooldown>0?cooldown.toFixed(1)+L(' с',' s'):L('Готово','Ready');
    if(elapsed-lastCheckpoint>=5)checkpoint();
  }
  function drawSprite(index,x,y,w,h,flip=false,bob=0){
    if(!ready(sprites))return;
    const sw=sprites.naturalWidth/3,sh=sprites.naturalHeight/2;
    ctx.save();ctx.translate(x,y+bob);if(flip)ctx.scale(-1,1);
    ctx.drawImage(sprites,index%3*sw,Math.floor(index/3)*sh,sw,sh,-w/2,-h,w,h);ctx.restore();
  }
  function shadow(x,y,w=12){
    ctx.fillStyle='#2c170c55';ctx.beginPath();ctx.ellipse(x,y+1,w,w*.35,0,0,Math.PI*2);ctx.fill();
  }
  function sparkle(x,y,size,color){
    ctx.fillStyle=color;ctx.beginPath();
    for(let i=0;i<8;i++){
      const a=-Math.PI/2+i*Math.PI/4,r=i%2?size*.32:size;
      if(i===0)ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
    }
    ctx.closePath();ctx.fill();
  }
  function drawPhone(){
    ctx.save();ctx.translate(-11,-27);ctx.rotate(-.18);
    ctx.fillStyle='#3a2834';ctx.strokeStyle='#b997c5';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(-5,-8,10,16,2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#b9a9c7';ctx.fillRect(-3,-5,6,10);
    ctx.fillStyle='#231e30';ctx.beginPath();ctx.arc(-1,-3,2,0,Math.PI*2);ctx.fill();
    sparkle(2,-4,3,'#fff8d8');ctx.restore();
  }
  function drawPlayer(t){
    const actor=player.facing==='rear'?rear:front,frames=player.facing==='rear'?meta.rearAtlas:meta;
    const index=player.moving?4+Math.floor(t*9)%4:0;
    shadow(player.x,player.y,12);
    ctx.save();ctx.translate(player.x,player.y);if(player.flip&&player.facing==='front')ctx.scale(-1,1);
    if(shield>0&&Math.floor(t*10)%2===0)ctx.globalAlpha=.55;
    if(ready(actor)){
      const [x,y,w,h]=frames.bounds[index];
      const height=52,width=w/h*height;
      ctx.drawImage(actor,x,y,w,h,-width/2,-height,width,height);
    }else{
      ctx.fillStyle='#af28e5';ctx.beginPath();ctx.arc(0,-18,12,0,Math.PI*2);ctx.fill();
    }
    if(player.carry)drawSprite(0,9,-9,24,24);
    if(effect>0)drawPhone();
    ctx.restore();
  }
  function drawLamp(lamp,t){
    if(lamp.lit){
      const glow=ctx.createRadialGradient(lamp.x,lamp.y,8,lamp.x,lamp.y,LIGHT_RADIUS);
      glow.addColorStop(0,'#fff0b790');glow.addColorStop(.65,'#ffe29c55');glow.addColorStop(1,'#ffe29c08');
      ctx.save();ctx.beginPath();ctx.rect(33,42,294,548);ctx.clip();ctx.beginPath();ctx.arc(lamp.x,lamp.y,LIGHT_RADIUS,0,Math.PI*2);
      ctx.fillStyle=glow;ctx.fill();ctx.strokeStyle='#ffe9ab80';ctx.lineWidth=1.3;ctx.setLineDash([5,7]);ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.translate(lamp.x,lamp.y);
    if(!lamp.lit){ctx.strokeStyle='#ffe2aa';ctx.lineWidth=1.5;ctx.globalAlpha=.55+Math.sin(t*4)*.35;ctx.beginPath();ctx.arc(0,-1,14,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    shadow(0,0,9);ctx.fillStyle='#71482a';ctx.fillRect(-8,-5,16,4);ctx.fillRect(-2,-19,4,17);
    ctx.strokeStyle='#71482a';ctx.lineWidth=2;ctx.fillStyle=lamp.lit?'#ffe3a0':'#ac9b79';
    ctx.beginPath();ctx.moveTo(-10,-15);ctx.lineTo(-7,-25);ctx.lineTo(7,-25);ctx.lineTo(10,-15);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.font='bold 10px Nunito,sans-serif';ctx.textAlign='center';ctx.fillStyle=lamp.lit?'#fff0bd':'#ffda94';ctx.fillText(lamp.lit?L('Без моли','Moth-free'):L('Вкл. свет','Switch on'),0,13);ctx.restore();
  }
  function drawEnemy(e,t){
    const asleep=e.kind==='mimic'&&e.state==='sleeping';
    const masked=isMaskedEnemy(e);
    shadow(e.x,e.y,e.kind==='mouse'?9:12);
    if(e.kind==='mouse'){
      drawSprite(3,e.x,e.y,39,39,e.facing<0,e.stun>0?0:-Math.abs(Math.sin(t*11))*2.2);
      if(e.stolen!==null){const parcel=parcels.find(p=>p.id===e.stolen);drawSprite(parcel&&isObscured(parcel)?0:5,e.x+6,e.y-18,29,29);}
    }else if(e.kind==='moth'){
      ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.stun>0?.68:.8+.2*Math.sin(t*20),1);
      drawSprite(4,0,0,47,47,e.facing<0,e.stun>0?0:-7+Math.sin(t*6)*3);ctx.restore();
    }else{
      drawSprite(enemyBoxSprite(e),e.x,e.y,40,40,e.facing<0,e.stun>0||asleep?0:-Math.abs(Math.sin(t*8+e.id))*3);
    }
    ctx.textAlign='center';ctx.font='bold 14px Nunito,sans-serif';
    if(e.stun>0){
      // Three gently rotating dazzled stars, with no repeated flashing.
      for(let i=0;i<3;i++){const a=t*2+i*Math.PI*2/3;sparkle(e.x+Math.cos(a)*12,e.y-37+Math.sin(a)*4,3.2+i*.35,'#fff0ad');}
    }
    else if(e.kind==='mimic'&&e.state==='warning'&&!masked){ctx.fillStyle='#ffcf76';ctx.strokeStyle='#62321e';ctx.lineWidth=2;ctx.strokeText('!',e.x,e.y-38);ctx.fillText('!',e.x,e.y-38);}
  }
  function drawDust(t){
    for(const moth of enemies.filter(e=>e.kind==='moth'&&e.stun<=0&&!inLight(e))){
      ctx.save();ctx.beginPath();ctx.rect(33,42,294,safe.y-42);ctx.clip();
      // Subtract each lamp from the current clip separately so overlapping
      // light circles stay protected, rather than cancelling each other.
      for(const lamp of lamps.filter(l=>l.lit)){
        ctx.beginPath();ctx.rect(33,42,294,safe.y-42);
        ctx.moveTo(lamp.x+LIGHT_RADIUS,lamp.y);ctx.arc(lamp.x,lamp.y,LIGHT_RADIUS,0,Math.PI*2);ctx.clip('evenodd');
      }
      const r=DUST_RADIUS+10+Math.sin(t*2)*4,cloud=ctx.createRadialGradient(moth.x,moth.y-9,8,moth.x,moth.y-9,r);
      cloud.addColorStop(0,'#d6be9aa0');cloud.addColorStop(.55,'#cdbb9a80');cloud.addColorStop(1,'#d1bda000');
      ctx.fillStyle=cloud;ctx.fillRect(moth.x-r,moth.y-9-r,r*2,r*2);
      ctx.fillStyle='#fff5cf8a';
      for(let i=0;i<12;i++){const a=t*(.8+i*.035)+i*2.4,d=13+(i*9)%45;ctx.beginPath();ctx.arc(moth.x+Math.cos(a)*d,moth.y-13+Math.sin(a)*d,1.2+(i%2)*.5,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  }
  function drawFlash(){
    if(effect<=0||!flashAt)return;
    const progress=1-effect/FLASH_PULSE,fade=1-progress,r=30+(FLASH_RADIUS-30)*Math.min(1,progress*1.8);
    ctx.save();ctx.beginPath();ctx.rect(33,42,294,548);ctx.clip();
    // A single warm pulse confined to the action radius, never a full-screen
    // white flicker. Its opacity decreases smoothly while the light expands.
    const glow=ctx.createRadialGradient(flashAt.x,flashAt.y,0,flashAt.x,flashAt.y,r);
    glow.addColorStop(0,'#fffde6b0');glow.addColorStop(.45,'#ffe9ac68');glow.addColorStop(1,'#ffe8a300');
    ctx.globalAlpha=fade*.8;ctx.fillStyle=glow;ctx.fillRect(flashAt.x-r,flashAt.y-r,r*2,r*2);
    ctx.strokeStyle='#fff5c5';ctx.globalAlpha=fade*.65;ctx.lineWidth=1.5;ctx.setLineDash([4,6]);
    ctx.beginPath();ctx.arc(flashAt.x,flashAt.y,FLASH_RADIUS,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.globalAlpha=fade;sparkle(flashAt.phoneX,flashAt.phoneY,12+progress*9,'#fff9d9');
    ctx.restore();
  }
  function draw(now){
    const t=now/1000;ctx.setTransform(2,0,0,2,0,0);
    const board=boards[episode];
    if(ready(board))ctx.drawImage(board,0,0,W,H);else{ctx.fillStyle='#75502e';ctx.fillRect(0,0,W,H);}
    ctx.save();ctx.strokeStyle='#ffd582';ctx.lineWidth=1.6;ctx.shadowColor='#ffd586';ctx.shadowBlur=12;
    ctx.globalAlpha=.55+Math.sin(t*3)*.12;ctx.strokeRect(safe.x+1,safe.y+1,safe.w-2,safe.h-2);ctx.restore();
    ctx.fillStyle='#fff0bc';ctx.font='bold 12px Nunito, sans-serif';ctx.textAlign='center';ctx.fillText(L('Зона сортировки','Sorting area'),W/2,safe.y+17);
    lamps.forEach(lamp=>drawLamp(lamp,t));
    for(let i=0;i<score;i++)drawSprite(0,58+i*Math.min(36,244/Math.max(targetCount-1,1)),581,targetCount>7?26:30,targetCount>7?26:30);
    const drawables=parcels.filter(p=>!p.delivered&&p!==player.carry&&p.mouseId===null).map(p=>({y:p.y,paint:()=>{
      const obscured=isObscured(p);
      shadow(p.x,p.y,11);drawSprite(obscured?0:5,p.x,p.y,40,40,p.facing<0,-Math.abs(Math.sin(t*8+p.id))*3);
      if(p.id===followId){
        ctx.strokeStyle='#ffe1a1';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,17,7,0,0,Math.PI*2);ctx.stroke();
      }
    }}));
    enemies.forEach(e=>drawables.push({y:e.y,paint:()=>drawEnemy(e,t)}));
    drawables.push({y:player.y,paint:()=>drawPlayer(t)});drawables.sort((a,b)=>a.y-b.y).forEach(o=>o.paint());
    drawDust(t);
    drawFlash();
    if(dustAt(player)){
      ctx.save();ctx.textAlign='center';ctx.font='bold 13px Nunito,sans-serif';ctx.lineWidth=3;
      ctx.strokeStyle='#493023';ctx.fillStyle='#ffe4a3';const y=Math.max(46,player.y-55);
      ctx.strokeText(L('−30% скорости','−30% speed'),player.x,y);ctx.fillText(L('−30% скорости','−30% speed'),player.x,y);ctx.restore();
    }
  }
  function unlockSound(){
    if(muted)return;
    try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio??=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});}}catch{}
    el('sound').setAttribute('aria-pressed',String(!muted));el('sound').title=L('Отключить звук','Mute sound');
  }
  function cue(hz,duration,volume=.045,delay=0,bus='sfx'){
    if(muted||externalHold||!audio||audio.state!=='running'||status==='paused'||audioPrefs[bus+'Muted'])return;
    if(campaignMode)volume*=audioPrefs[bus+'Volume']/(bus==='music'?.3:.55);
    if(volume<=0)return;
    const start=audio.currentTime+delay,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='triangle';osc.frequency.value=hz;gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.018);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    osc.connect(gain).connect(audio.destination);osc.start(start);osc.stop(start+duration+.015);
  }
  // Music: the basement loop «Коробки на цыпочках» (set B, 24.11.2026). It plays only while an episode
  // is being played and fades out on pause, hold, mute or a hidden page; resuming continues where it stopped.
  const MUSIC=Object.freeze({file:'../../assets/audio/music/basement.ogg'});
  let musicBuffer=null,musicLoading=false,musicFailedAt=-Infinity,musicSource=null,musicGain=null,musicLevel=0,musicStartedAt=0,musicOffset=0;
  function loadMusic(){
    if(musicBuffer||musicLoading||performance.now()-musicFailedAt<60000)return;
    musicLoading=true;const context=audio;
    fetch(MUSIC.file).then(response=>{if(!response.ok)throw Error('music');return response.arrayBuffer();})
      .then(data=>new Promise((resolve,reject)=>{const decoded=context.decodeAudioData(data,resolve,reject);if(decoded&&typeof decoded.then==='function')decoded.then(resolve,reject);}))
      .then(buffer=>{if(context===audio&&buffer?.duration>0)musicBuffer=buffer;},()=>{musicFailedAt=performance.now();})
      .finally(()=>{musicLoading=false;});
  }
  function music(){
    if(!audio)return;
    const level=muted||externalHold||document.hidden||status!=='play'||audio.state!=='running'||audioPrefs.musicMuted?0:campaignMode?audioPrefs.musicVolume:.3;
    if(level>0&&!musicBuffer){loadMusic();return;}
    if(level===musicLevel)return;
    const now=audio.currentTime;
    if(level>0&&!musicSource){
      musicGain=audio.createGain();musicGain.gain.setValueAtTime(0,now);musicGain.gain.linearRampToValueAtTime(level,now+.25);musicGain.connect(audio.destination);
      musicSource=audio.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;musicSource.connect(musicGain);
      musicSource.start(now,musicOffset%musicBuffer.duration);musicStartedAt=now;
    }else if(level>0){musicGain.gain.cancelScheduledValues(now);musicGain.gain.setTargetAtTime(level,now,.05);}
    else if(musicSource){
      musicOffset=(musicOffset+now-musicStartedAt)%musicBuffer.duration;
      const source=musicSource,gain=musicGain;musicSource=null;musicGain=null;
      gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+.2);
      source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}};
      try{source.stop(now+.25);}catch{}
    }
    musicLevel=level;
  }
  canvas.addEventListener('pointerdown',event=>{
    if(status!=='play')return;event.preventDefault();canvas.focus({preventScroll:true});
    const r=canvas.getBoundingClientRect(),target={x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};
    const lamp=lamps.find(l=>!l.lit&&Math.abs(l.x-target.x)<16&&target.y>l.y-30&&target.y<l.y+15);
    const chosen=!lamp&&!player.carry&&parcels.filter(p=>!p.delivered&&!isObscured(p)&&Math.abs(p.x-target.x)<22&&target.y>p.y-43&&target.y<p.y+9)
      .sort((a,b)=>Math.hypot(a.x-target.x,a.y-20-target.y)-Math.hypot(b.x-target.x,b.y-20-target.y))[0];
    keys.clear();followId=chosen?chosen.id:null;retarget=.22;route=pathTo(player,lamp||chosen||target);
  });
  document.addEventListener('keydown',event=>{
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(status==='play'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' '].includes(key)){
      event.preventDefault();if(key===' '){if(!event.repeat)useFlash();}else keys.add(key);
    }else if(key==='Escape'&&(status==='play'||status==='paused'))pause();
  });
  document.addEventListener('keyup',event=>keys.delete(event.key.length===1?event.key.toLowerCase():event.key));
  window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden&&status==='play')pause();music();});
  if(campaignMode)window.addEventListener('message',event=>{
    if(event.source!==globalThis.parent||event.origin!==location.origin)return;
    if(event.data?.type==='ppt-town-basement-restore')restoreCheckpoint(event.data.data);
    else if(event.data?.type==='ppt-town-basement-hold'){externalHold=event.data.hold===true;if(externalHold&&status==='play')pause();music();}
  });
  el('primary').addEventListener('click',()=>{
    if(status==='won'){
      if(campaignMode){checkpoint();globalThis.parent.postMessage({type:'ppt-town-basement-complete',episode},location.origin==='null'?'*':location.origin);return;}
      if(episode===episodes.length-1)selectEpisode(0);
      else selectEpisode(episode+1);
    }else start(status==='lost');
  });
  el('restart').addEventListener('click',()=>start(true));el('pause').addEventListener('click',pause);el('flash').addEventListener('click',useFlash);
  el('episode-picker').addEventListener('click',event=>{
    const button=event.target.closest('button[data-episode]');if(!button)return;
    selectEpisode(Number(button.dataset.episode));
  });
  el('help-toggle').addEventListener('change',()=>{help=el('help-toggle').checked;checkpoint();});
  el('sound').addEventListener('click',()=>{muted=!muted;if(!muted)unlockSound();else{el('sound').setAttribute('aria-pressed','false');el('sound').title=L('Включить звук','Enable sound');}});
  if(campaignMode)el('episode-picker').hidden=true;
  if(lang==='en'&&document.documentElement){document.documentElement.lang='en';document.title='Restless parcels';document.querySelector('.counter')?.setAttribute('aria-label','Parcels');document.querySelector('.playfield')?.setAttribute('aria-label','Basement');canvas.setAttribute('aria-label','Playfield. Tap the floor to move, or use the arrow keys.');el('episode-picker').setAttribute('aria-label','Choose a test episode');el('flash').querySelector('span').textContent='Flash';el('flash').setAttribute('aria-label','Phone flash: dazzle nearby tricksters for 4 seconds');el('flash').title='4 s dazzle · 6 s recharge';el('lives').title='Five lives; a collision costs one.';el('help-option').lastChild.textContent=' Calm mode (slower tricksters)';el('pause').setAttribute('aria-label','Pause');el('sound').setAttribute('aria-label','Sound');}
  selectEpisode(campaignMode?requestedEpisode:0);checkpoint();let last=performance.now();
  function frame(now){const dt=clip((now-last)/1000,0,.05);last=now;update(dt);draw(now);music();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  // Read-only state for the local prototype QA, separate from campaign saves.
  globalThis.BasementPreview=Object.freeze({snapshot:()=>structuredClone({status,episode,targetCount,lives,player,parcels,enemies,lamps,obstacles,score,elapsed,cooldown,route,followId,help,flashAt,lastFlashHits,
    obscuredIds:parcels.filter(isObscured).map(p=>p.id),maskedEnemyIds:enemies.filter(isMaskedEnemy).map(e=>e.id),lightProtectedIds:parcels.filter(inLight).map(p=>p.id),playerSlowed:dustAt(player),playerSpeed:playerSpeed(),playerInLight:inLight(player)}),safe:{...safe},rules:{maxLives:MAX_LIVES,flashRadius:FLASH_RADIUS,flashBlind:FLASH_BLIND,flashCooldown:FLASH_COOLDOWN,lightRadius:LIGHT_RADIUS,dustRadius:DUST_RADIUS,playerSpeed:PLAYER_SPEED,dustSpeedMultiplier:DUST_SPEED_MULTIPLIER}});
})();
