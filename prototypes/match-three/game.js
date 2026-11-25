(()=>{'use strict';
const M=MatchThree,{W,H,TYPES,RETURN,SPOILED,GOLD,WRAPPED,LEVELS}=M,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d'),P=120;
const ASSET='../../assets/campaign/match-three/passport-v5/',colorNames=['red','blue','yellow','green'],shapeNames=['circle','square','triangle','star'];
const sources=[...TYPES.map(({c,s})=>`parcel-${colorNames[c]}-${shapeNames[s]}.png`),'parcel-return.png','parcel-spoiled.png'];
const imgs=sources.map(src=>{const i=new Image();i.src=ASSET+src;return i;});
const basement=new Image();basement.src='../../assets/campaign/town/basement-sprites.webp';
// Rasterize the static materials/marks once, not 56 times on every animation
// frame. 224px backing size retains the details on high-DPI phones.
const tileCache=new Map();
function basementSprite(g,index,x,y,size){if(!basement.complete||!basement.naturalWidth)return false;const w=basement.naturalWidth/3,h=basement.naturalHeight/2;g.drawImage(basement,index%3*w,Math.floor(index/3)*h,w,h,x-size/2,y-size/2,size,size);return true;}
// The accepted V5 art is baked at 344px, including perspective-correct labels
// and bounded return/spoil markings. All normal and special tiles keep the same
// square drawing envelope for the existing drag and landing animations.
const BODY_EXTENT=1.14,TILE_SIZE=98;
function shape(g,s,r){g.beginPath();if(s===0)g.arc(0,0,r,0,Math.PI*2);else if(s===1)g.rect(-r*.85,-r*.85,r*1.7,r*1.7);else if(s===2){g.moveTo(0,-r);g.lineTo(r*.98,r*.75);g.lineTo(-r*.98,r*.75);g.closePath();}else{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.52:r*1.05;g.lineTo(Math.cos(a)*q,Math.sin(a)*q);}g.closePath();}}
function passportFallback(g,t,extent){
  // Correct symbols remain immediately playable if a PNG is still decoding.
  const ret=t===RETURN||t===SPOILED,c=ret?4:TYPES[t].c;
  g.save();g.scale(extent/344,extent/344);g.translate(-172,-172);
  g.fillStyle=['#dc4b43','#368ad5','#eac43c','#40ac61','#c69a63'][c];g.beginPath();g.roundRect(30,55,286,246,18);g.fill();
  g.fillStyle='#e6c38a';g.fillRect(112,55,58,246);
  g.translate(127,213);g.transform(1,.195,-.024,1,0,0);
  g.fillStyle='#a27648';g.beginPath();g.roundRect(-70,-50,142,104,8);g.fill();g.fillStyle='#e8cb93';g.strokeStyle=['#a13730','#205f9d','#a98324','#267c42','#8d623b'][c];g.lineWidth=4.5;g.beginPath();g.roundRect(-72,-53,142,104,8);g.fill();g.stroke();
  if(!ret){g.translate(-1,-1);shape(g,TYPES[t].s,37);g.fillStyle='#4a2d1c';g.fill();}
  else{const bad=t===SPOILED,r=bad?30:34,ax=bad?-22:-1,ay=2,start=40*Math.PI/180,a=292*Math.PI/180,nx=Math.cos(a),ny=Math.sin(a),tx=-ny,ty=nx,u=ax+nx*r,v=ay+ny*r;g.strokeStyle='#624022';g.lineWidth=10;g.lineCap='round';g.lineJoin='round';g.beginPath();g.arc(ax,ay,r,start,a);g.stroke();g.beginPath();g.moveTo(u-tx*12+nx*8,v-ty*12+ny*8);g.lineTo(u,v);g.lineTo(u-tx*12-nx*8,v-ty*12-ny*8);g.stroke();if(bad){g.fillStyle='#b52d3b';g.beginPath();g.arc(42,23,21,0,Math.PI*2);g.fill();g.strokeStyle='#fff0d1';g.lineWidth=6;g.beginPath();g.moveTo(31,12);g.lineTo(53,34);g.moveTo(31,34);g.lineTo(53,12);g.stroke();}}
  g.restore();
}
function box(g,t,x,y,size,opacity=1,scale=1){
  if(t==null)return;const extent=size*BODY_EXTENT;
  // Even the fade/bump effect cannot make a board parcel larger than its cell.
  if(g===ctx)scale=Math.min(scale,P/extent);
  g.save();g.globalAlpha=opacity;g.translate(x,y);g.scale(scale,scale);
  if(g===ctx&&size===TILE_SIZE&&tileCache.has(t)){g.drawImage(tileCache.get(t),-extent/2,-extent/2,extent,extent);g.restore();return;}
  if(t===GOLD||t===WRAPPED){if(!basementSprite(g,t===GOLD?5:2,0,0,extent)){g.fillStyle='#b8916a';g.fillRect(-size/2,-size/2,size,size);g.fillStyle='#783da0';g.fillRect(-size*.13,-size/2,size*.26,size);}g.restore();return;}
  const image=imgs[t];
  if(image?.complete&&image.naturalWidth)g.drawImage(image,-extent/2,-extent/2,extent,extent);else passportFallback(g,t,extent);
  g.restore();
}
function prepareTileCache(){
  if(![...imgs,basement].every(i=>i.complete&&i.naturalWidth))return;
  for(const t of [...TYPES.keys(),RETURN,SPOILED,GOLD,WRAPPED]){const tile=document.createElement('canvas');tile.width=tile.height=224;const g=tile.getContext('2d');if(!g)continue;box(g,t,112,112,224/BODY_EXTENT);tileCache.set(t,tile);}
}
let grid=[],level=0,moves=0,normal=0,returns=0,spoiled=0,wrapped=0,selected=-1,highlight=[],busy=false,ended=false,serial=0,down=null,mouse=1,moth=1,tool=null,tutorial=null,completedStages=0;
let campaignMode=null,campaignPaused=false,currentLang='ru',lastMessageRu='';
const tr=s=>globalThis.PptMatchThreeI18n?.text(s,currentLang)??s;
// Controlled exercises before each stage, including the initial arrival.
// Fixtures use the corresponding battle palette, and the same real exchange,
// clear, gravity and helper paths as combat. No training resources carry over.
const TRAINING=[
  [
    {title:'Собери тройку',text:'Перетащи одну выделенную коробку к другой или нажми обе по очереди. Собери три коробки одного цвета и с одинаковым знаком: совпадения исчезнут, остальные упадут.',hint:'Поменяй две подсвеченные коробки.',success:'Отлично! Три одинаковые коробки собраны, а новые заполнили свободные клетки.',pair:[18,25],targets:[23,24],fixture:{18:2,23:2,24:2},goals:{count:3,returns:0,spoiled:0,wrapped:0}},
    {title:'Создай бонусную посылку',text:'Поменяй выделенную пару. Четыре одинаковые коробки в ряд образуют бонусную посылку.',hint:'Замени выделенную коробку, чтобы собрать четыре в ряд.',success:'Бонусная посылка создана! На следующем шаге попробуй её использовать.',pair:[16,23],targets:[22,24,25],fixture:{16:4,22:4,24:4,25:4},requireGold:true,goals:{count:4,returns:0,spoiled:0,wrapped:0}},
    {title:'Используй бонусную посылку',text:'Поменяй бонусную посылку с выделенной обычной коробкой. Все посылки именно этого цвета и знака исчезнут одновременно.',hint:'Поменяй бонусную посылку с подсвеченной обычной.',success:'Бонусная посылка убрала все коробки выбранного вида. Теперь можно начинать первую партию!',targets:[],goals:{count:0,returns:0,spoiled:0,wrapped:0}}
  ],[
    {title:'Отправь возврат',text:'Поменяй выделенную пару. Тройка уберёт опору под возвратом, и он упадёт на нижнюю линию отправки.',hint:'Убери опору под возвратом, поменяв выделенную пару.',success:'Возврат принят на нижней линии. В партии нужно отправить три возврата, отдельного счётчика обычных посылок нет.',pair:[46,53],targets:[45],fixture:{45:RETURN,46:2,51:2,52:2},goals:{count:0,returns:1,spoiled:0,wrapped:0}}
  ],[
    {title:'Расчисти завал',text:'Перетащи одну выделенную коробку к другой или нажми обе по очереди. Тройка одного цвета и знака уберёт препятствия по стороне. Их нельзя менять местами.',hint:'Поменяй две подсвеченные коробки.',success:'Оба препятствия убраны! Тройка рядом очищает то, что нельзя поменять местами.',pair:[18,25],targets:[16,31],fixture:{16:SPOILED,31:WRAPPED,18:2,23:2,24:2},goals:{count:0,returns:0,spoiled:1,wrapped:1}},
    {title:'Отправь возврат',text:'Поменяй выделенную пару. Тройка уберёт опору под возвратом, и он упадёт на нижнюю линию отправки.',hint:'Убери опору под возвратом, поменяв выделенную пару.',success:'Возврат принят на нижней линии. Освобождай клетки под ним, чтобы отправить следующие возвраты.',pair:[46,53],targets:[45],fixture:{45:RETURN,46:0,51:0,52:0},goals:{count:0,returns:1,spoiled:0,wrapped:0}},
    {title:'Попробуй Мышку',text:'Выбери Мышку, затем коробку под возвратом. Она уберёт опору без обмена и траты хода.',hint:'Сначала нажми кнопку Мышки.',chosen:'Теперь нажми подсвеченную коробку под возвратом.',success:'Мышка убрала опору и помогла отправить возврат. В боевой партии такой помощник доступен один раз.',tool:'mouse',targets:[52],fixture:{45:RETURN},goals:{count:0,returns:1,spoiled:0,wrapped:0}},
    {title:'Попробуй Моль',text:'Выбери Моль, затем связанную коробку в рамке. Моль убирает связанную или испорченную коробку без траты хода.',hint:'Сначала нажми кнопку Моли.',chosen:'Теперь нажми подсвеченную связанную коробку.',success:'Готово! В боевой партии отправляй возвраты и убирай порчу и связанные коробки. Обычные посылки служат для расчистки пути.',tool:'moth',targets:[24],fixture:{24:WRAPPED},goals:{count:0,returns:0,spoiled:0,wrapped:1}}
  ]
];
function trainingFixture(n,step){
  const g=Array.from({length:W*H},(_,k)=>(k%W+2*Math.floor(k/W))%LEVELS[n].types);
  return Object.assign(g,TRAINING[n][step].fixture);
}
function trainingRng(n,step,initial=101+n*37+step*31){let seed=initial>>>0;const rng=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);rng.state=()=>seed;return rng;}
// Choose a legal use of an actual bonus that survived the real four-match
// and gravity. Never manufacture a replacement board for this exercise.
function bonusContinuation(board,rngSeed){
  let best=null;for(let k=0;k<board.length;k++)if(board[k]===GOLD)for(const j of M.neighbors(k))if(M.isNormal(board[j])){
    const bonusType=board[j],count=board.filter(t=>t===bonusType).length;
    if(!best||count>best.count)best={pair:[k,j],count,bonusType};
  }
  return best?{...best,grid:board.slice(),rngSeed}:null;
}
function exercise(){if(!tutorial)return null;const base=TRAINING[tutorial.level][tutorial.step];return tutorial.continuation?{...base,pair:tutorial.continuation.pair,goals:{...base.goals,count:tutorial.continuation.count}}:base;}
const activeGoals=()=>exercise()?.goals??LEVELS[level];
const trainingDone=()=>!!tutorial?.complete;
function trainingSwap(a,b){const s=exercise();return !s||!!s.pair&&(s.pair[0]===a&&s.pair[1]===b||s.pair[1]===a&&s.pair[0]===b);}
function trainingTool(id,k){const s=exercise();return !s||s.tool===id&&s.targets.includes(k);}
function trainingHint(){const s=exercise();return s?(tool===s.tool&&s.chosen?s.chosen:s.hint):'';}
const hasToolTarget=id=>grid.some(t=>id==='mouse'?M.isNormal(t):[SPOILED,WRAPPED].includes(t));
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const easeInOut=q=>q<.5?4*q*q*q:1-Math.pow(-2*q+2,3)/2;
const easeOut=q=>1-Math.pow(1-q,3);
const ANIM={swap:270,notice:85,clear:335,landing:155,gravity:34,reshuffle:310,dragSlop:12,commit:.43};
const pos=k=>({x:(k%W+.5)*P,y:(Math.floor(k/W)+.5)*P});
function background(){ctx.clearRect(0,0,canvas.width,canvas.height);const dock=activeGoals().returns>0;for(let k=0;k<W*H;k++){const {x,y}=pos(k);ctx.beginPath();ctx.roundRect(x-P/2+4,y-P/2+4,P-8,P-8,15);ctx.fillStyle=(Math.floor(k/W)+k%W)%2?'#243243bb':'#1b2632ba';ctx.fill();ctx.strokeStyle='#7180902d';ctx.lineWidth=2;ctx.stroke();if(k>=W*(H-1)&&dock){ctx.strokeStyle='#c89749aa';ctx.lineWidth=3;ctx.stroke();}}if(dock){ctx.fillStyle='#e1b96b';ctx.fillRect(5,H*P-5,W*P-10,3);}}
// A falling parcel never rebounds downwards. A tiny anchored squash/stretch
// conveys its weight without changing support, cell occupancy or the floor.
function drawTile(t){
  if(t.t==null)return;
  const lift=t.lift??0,sx=t.sx??1,sy=t.sy??1,opacity=t.opacity??1,scale=t.scale??1;
  if(lift>0){ctx.save();ctx.globalAlpha=.25*lift*opacity;ctx.fillStyle='#080c12';ctx.beginPath();ctx.ellipse(t.x,t.y+43,43+lift*3,7+lift*2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(sx!==1||sy!==1){ctx.save();ctx.translate(t.x,t.y+(TILE_SIZE*BODY_EXTENT/2)*(1-sy));ctx.scale(sx,sy);box(ctx,t.t,0,0,TILE_SIZE,opacity,scale);ctx.restore();}
  else box(ctx,t.t,t.x,t.y,TILE_SIZE,opacity,scale);
}
// Visual scatter is deliberately isolated from the gameplay RNG.
function noise(seed){const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x);}
function scatter(x,y,start,seed,count,landing=false,tileType=null){const dust=[];for(let i=0;i<count;i++){
  const n=seed*19+i*7,j=noise(n),angle=(i/count*Math.PI*2)+noise(n+2)*.5,speed=landing?25+30*j:31+69*j;
  const tape=!landing&&count>=3&&i===count-1,colour=tape&&M.isNormal(tileType)?['#be5252','#4f8dbc','#dbb04d','#5f9a68'][TYPES[tileType].c]:tape&&(tileType===GOLD||tileType===WRAPPED)?'#a878c5':['#be8b56','#dcb187','#f4cf83','#a77546'][Math.floor(noise(n+5)*4)];
  dust.push({x,y,start:start+noise(n+3)*(landing?12:36),life:landing?110+noise(n+4)*30:195+noise(n+4)*65,vx:landing?(i%2?1:-1)*speed:Math.cos(angle)*speed,vy:landing?-24-39*j:-50+Math.sin(angle)*speed,gravity:landing?140:185,size:landing?2+2*j:2.5+3*j,chip:!landing&&(tape||i%3===0),colour});
}return dust;}
function drawDust(dust,elapsed){if(reduced||!dust)return;for(const d of dust){const age=elapsed-d.start;if(age<0||age>d.life)continue;const t=age/1000,q=clamp(age/d.life),r=d.size*(1-.32*q),x=d.x+d.vx*t,y=d.y+d.vy*t+.5*d.gravity*t*t;if(x<-r||x>W*P+r||y<-r||y>H*P-r)continue;ctx.save();ctx.globalAlpha=(1-q)*(d.chip ? .86 : .56);ctx.fillStyle=d.colour;if(d.chip){ctx.translate(x,y);ctx.rotate(q*.9+d.vx*.01);ctx.fillRect(-r*.8,-r*.4,r*1.6,r*.8);}else{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();}}
// Tutorial cues describe the next actual action. Non-interactive objectives
// are only outlined quietly; a helper target pulses only after the helper is selected.
function trainingActionCells(){
  const s=exercise();if(!s||trainingDone()||busy||campaignPaused)return [];
  if(s.tool)return tool===s.tool?s.targets:[];
  const pair=s.pair??[],picked=down&&!down.tool?down.k:selected;
  return pair.includes(picked)?pair.filter(k=>k!==picked):pair;
}
function drawTrainingGuide(){
  const s=exercise();if(!s||trainingDone()||busy)return;
  const actions=trainingActionCells();ctx.save();
  if(!s.tool)for(const k of s.targets){if(actions.includes(k))continue;const{x,y}=pos(k);ctx.setLineDash([9,7]);ctx.strokeStyle='#73b4cf';ctx.globalAlpha=.58;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-53,y-53,106,106,13);ctx.stroke();}
  ctx.restore();
}
// The actionable outlines are independent DOM elements over the canvas. CSS
// animates their glow even when the board is not redrawn; a tiny RAF fallback
// changes a CSS custom property if a preview host suppresses CSS animations.
// This is only a brightness cue (no movement), including reduced-motion mode.
const cueElements=[$('trainingCueA'),$('trainingCueB')];
let guideFrame=null,pulseNodes=[];
function scheduleGuidePulse(){
  if(guideFrame!==null||!pulseNodes.length)return;
  guideFrame=requestAnimationFrame(time=>{guideFrame=null;if(!pulseNodes.length)return;
    const wave=(Math.cos(time*Math.PI*2/(reduced?1500:1200))+1)*.5,value=(.34+.66*wave).toFixed(3);
    for(const element of pulseNodes)element.style.setProperty('--cue-opacity',value);
    scheduleGuidePulse();
  });
}
function syncTrainingCues(){
  const actions=trainingActionCells(),active=[];
  cueElements.forEach((element,i)=>{if(!element)return;const k=actions[i];element.hidden=k==null;
    if(k!=null){element.style.left=`${(k%W)*100/W}%`;element.style.top=`${Math.floor(k/W)*100/H}%`;element.style.width=`${100/W}%`;element.style.height=`${100/H}%`;active.push(element);}
  });
  for(const id of ['mouse','moth','tutorialAction']){const element=$(id);if(element&&!element.hidden&&!element.disabled&&element.classList?.contains?.('tutorial-focus'))active.push(element);}
  pulseNodes=active.filter(element=>typeof element.style?.setProperty==='function');
  scheduleGuidePulse();
}
function drawHelperFocus(){
  if(tutorial||busy||!tool)return;
  for(let k=0;k<grid.length;k++){const valid=tool==='mouse'?M.isNormal(grid[k]):[SPOILED,WRAPPED].includes(grid[k]);if(valid&&tool==='mouse')continue;
    const{x,y}=pos(k);ctx.save();ctx.beginPath();ctx.roundRect(x-53,y-53,106,106,13);if(valid){ctx.strokeStyle='#edca83';ctx.lineWidth=4;ctx.stroke();}else{ctx.fillStyle='#14202b';ctx.globalAlpha=.27;ctx.fill();}ctx.restore();
  }
}
function draw(tiles=null,omit=new Set(),fx={}){
  background();
  for(const k of fx.matches??[]){const{x,y}=pos(k);ctx.save();ctx.globalAlpha=fx.matchAlpha??.3;ctx.fillStyle='#a97940';ctx.strokeStyle='#e1b679';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-52,y-52,104,104,14);ctx.fill();ctx.stroke();ctx.restore();}
  if(fx.target>=0){const{x,y}=pos(fx.target);ctx.save();ctx.fillStyle=tutorial?'#75d5ff28':'#c4a16c25';ctx.strokeStyle=tutorial?'#75d5ffbd':'#c4a16cad';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-52,y-52,104,104,14);ctx.fill();ctx.stroke();ctx.restore();}
  if(tiles)for(const t of tiles)drawTile(t);else for(let k=0;k<grid.length;k++)if(!omit.has(k))drawTile({t:grid[k],...pos(k)});
  drawDust(fx.dust,fx.elapsed??0);
  drawHelperFocus();
  drawTrainingGuide();
  for(const k of [selected,...highlight])if(k>=0){const{x,y}=pos(k);ctx.save();ctx.beginPath();ctx.roundRect(x-53,y-53,106,106,15);ctx.lineWidth=k===selected?3:4;ctx.strokeStyle=tutorial?'#76c8ee':k===selected?'#d3b994cc':'#f1c77ad9';ctx.stroke();ctx.restore();}
  syncTrainingCues();
}
function hud(){
  const l=activeGoals(),s=exercise(),locked=busy||!!down||campaignPaused,finished=ended||trainingDone();
  $('moves').textContent=tutorial?'∞':moves;$('phase').textContent=tr(tutorial?'ТРЕНИРОВКА':'БОЕВАЯ ПАРТИЯ');$('stageName').textContent=tr(LEVELS[level].name);
  document.querySelector?.('.arcade')?.classList?.toggle?.('is-training',!!tutorial);
  for(const [counter,id,amount,total] of [['normal','normalGoal',normal,l.count],['returns','retGoal',returns,l.returns],['spoiled','badGoal',spoiled,l.spoiled],['wrapped','wrapGoal',wrapped,l.wrapped]]){
    $(counter).textContent=`${Math.min(amount,total)}/${total}`;$(id).hidden=!total;$(id).classList?.toggle?.('done',total>0&&amount>=total);
  }
  $('dockLegend').hidden=!l.returns;
  $('stars').hidden=!!tutorial||!ended;$('stars').textContent=ended&&won()?'★'.repeat(1+(moves>=3)+(moves>=7))+'☆'.repeat(2-(moves>=3)-(moves>=7)):'☆☆☆';
  $('hint').disabled=locked||finished;$('helpers').hidden=level!==2||!!s&&!s.tool;
  for(const [id,count] of [['mouse',mouse],['moth',moth]]){const button=$(id);button.hidden=!!s&&s.tool!==id;button.disabled=locked||finished||!count||!!s&&s.tool!==id||!hasToolTarget(id);button.setAttribute('aria-pressed',String(tool===id));button.classList?.toggle?.('tutorial-focus',!!s&&s.tool===id&&!button.disabled&&tool!==id);$(id+'Count').textContent=count;}
  $('tutorialPanel').hidden=!tutorial;$('tutorialAction').hidden=!trainingDone();$('tutorialAction').disabled=locked;$('tutorialAction').classList?.toggle?.('tutorial-focus',trainingDone()&&!locked);$('tutorialSkip').hidden=!tutorial;$('tutorialSkip').disabled=locked;
  if(s){const length=TRAINING[tutorial.level].length;$('tutorialStep').textContent=tr(`Шаг ${tutorial.step+1} из ${length}`);$('tutorialTitle').textContent=(trainingDone()?'✓ ':'')+tr(s.title);$('tutorialText').textContent=tr(trainingDone()?s.success:busy&&s.tool&&!(s.tool==='mouse'?mouse:moth)?'Смотри, как помощник освобождает клетку, а коробки падают.':tool===s.tool&&s.chosen?s.chosen:s.text);$('tutorialAction').textContent=tr(tutorial.step===length-1?'Начать боевую партию':'Далее');}
  document.querySelectorAll('[data-level]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level));b.disabled=locked||!!campaignMode;});
  $('restart').disabled=campaignPaused||!!campaignMode&&ended&&won();$('retry').disabled=campaignPaused||!!campaignMode&&ended&&won();$('next').disabled=campaignPaused;
}
const message=s=>{lastMessageRu=s;$('message').textContent=tr(s);};const won=()=>normal>=LEVELS[level].count&&returns>=LEVELS[level].returns&&spoiled>=LEVELS[level].spoiled&&wrapped>=LEVELS[level].wrapped;
const remainingGoals=()=>{const l=activeGoals();return {count:Math.max(0,l.count-normal),returns:Math.max(0,l.returns-returns),spoiled:Math.max(0,l.spoiled-spoiled),wrapped:Math.max(0,l.wrapped-wrapped)};};
function resetRun(n){serial++;const gesture=down;down=null;releaseCapture(gesture);canvas.style.cursor='grab';level=n;moves=LEVELS[level].moves;normal=returns=spoiled=wrapped=0;mouse=moth=1;tool=null;selected=-1;highlight=[];busy=ended=false;$('overlay').hidden=true;}
const battleIntro=()=>level===0?'Собери три одинаковые коробки по цвету и фигуре.':level===1?'Опусти все возвраты до нижней границы, освобождая путь.':'Спускай возвраты и убирай препятствия.';
function start(n){if(campaignMode&&n!==completedStages)return false;if(!campaignMode)completedStages=n;resetRun(n);tutorial=null;grid=M.fillGrid(LEVELS[level],Math.random);message(battleIntro());hud();draw();notifyCheckpoint();}
function startTutorial(n=level,step=0,continuation=null){
  if(campaignMode&&n!==completedStages)return false;
  // The third lesson is the same board, beginning at the settled snapshot
  // from the preceding exercise; a retry restores its saved entry state.
  if(n===0&&step===2&&!continuation){if(tutorial?.level===0&&tutorial.step===2)continuation=tutorial.continuation;else step=1;}
  if(!campaignMode)completedStages=n;resetRun(n);tutorial={level:n,step,complete:false,rng:trainingRng(n,step,continuation?.rngSeed),continuation};const s=exercise();grid=continuation?continuation.grid.slice():trainingFixture(n,step);mouse=+(s.tool==='mouse');moth=+(s.tool==='moth');message(s.hint);hud();draw();notifyCheckpoint();
}
function selectLevel(n){if(!Number.isInteger(n)||n<0||n>=LEVELS.length||campaignPaused)return;if(campaignMode&&n!==completedStages)return;startTutorial(n);}
function advanceTutorial(){if(!tutorial||busy||down||campaignPaused||!tutorial.complete)return;const n=tutorial.level,step=tutorial.step+1;if(step<TRAINING[n].length){const continuation=n===0&&step===2?bonusContinuation(grid,tutorial.rng.state()):null;if(n===0&&step===2&&!continuation)return;startTutorial(n,step,continuation);$('tutorialPanel').scrollIntoView?.({block:'nearest',behavior:'auto'});}else start(n);}
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
function animate(ms,paint,token){const duration=reduced?Math.min(ms,Math.max(120,ms*.65)):ms;return new Promise(resolve=>{const begin=performance.now();function step(now){if(token!==serial){resolve(false);return;}const q=Math.max(0,Math.min(1,(now-begin)/duration));paint(q);if(q<1)requestAnimationFrame(step);else resolve(true);}requestAnimationFrame(step);});}
const movable=t=>t!=null&&t!==SPOILED&&t!==WRAPPED;
function canSlide(a,b){return M.neighbors(a).includes(b)&&movable(grid[a])&&movable(grid[b]);}
function pairFrame(a,b,progress,lift=0){
  const p=clamp(progress),pa=pos(a),pb=b>=0?pos(b):pa,tiles=grid.flatMap((t,k)=>k===a||k===b||t==null?[]:[{t,...pos(k)}]);
  // The other parcel yields to the source slot underneath the held parcel.
  // Painter order keeps the held parcel above its neighbour during crossing.
  if(b>=0)tiles.push({t:grid[b],x:pb.x+(pa.x-pb.x)*p,y:pb.y+(pa.y-pb.y)*p,scale:reduced?1:1-.025*Math.sin(Math.PI*p)});
  tiles.push({t:grid[a],x:pa.x+(pb.x-pa.x)*p,y:pa.y+(pb.y-pa.y)*p,scale:reduced?1:1+.035*lift,lift:reduced?0:lift});return tiles;
}
function showPair(a,b,p,lift=0,target=-1){draw(pairFrame(a,b,p,lift),new Set(),{target});}
function swapAnim(a,b,token,from=0,to=1,held=false){
  const full=from===0&&to===1&&!held,ms=full?ANIM.swap:145+Math.abs(to-from)*115;
  return animate(ms,q=>{const e=full?easeInOut(q):easeOut(q);showPair(a,b,from+(to-from)*e,held?1-e:.65*Math.sin(Math.PI*q));},token);
}
function animateFall(motion,token){
  const max=Math.max(0,...motion.map(m=>m.to-m.from));if(!max)return Promise.resolve(true);
  // One common downward acceleration; shorter trips stop at their own support.
  const travel=1000*Math.sqrt(2*max/ANIM.gravity),duration=travel+ANIM.landing;
  const impacts=motion.map(m=>m.to>m.from?travel*Math.sqrt((m.to-m.from)/max):Infinity);
  const dust=reduced?[]:motion.flatMap((m,i)=>m.to>m.from?scatter((m.x+.5)*P,(m.to+.5)*P+43,impacts[i],serial*17+i*23,2,true):[]).slice(0,90);
  return animate(duration,q=>{const elapsed=q*duration,frame=M.fallFrame(motion,clamp(elapsed/travel),P);
    if(!reduced)for(let i=0;i<frame.length;i++){const age=elapsed-impacts[i];if(age<0||age>ANIM.landing)continue;const u=age/ANIM.landing,squash=Math.sin(2*Math.PI*u)*Math.pow(1-u,1.65);frame[i].sx=1+.056*squash;frame[i].sy=1-.065*squash;}
    draw(frame,new Set(),{dust,elapsed});
  },token);
}
async function resolveBoard(token,forced=[]){
  let combo=0;while(token===serial){
    const matches=M.matches(grid),bonus=M.longMatch(grid);for(const k of forced)matches.add(k);forced=[];const removed=M.clearSet(grid,matches);if(!removed.size)break;
    combo++;const old=grid.slice();message(combo>1?`Комбо ×${combo}!`:bonus>=0?'Четыре в ряд — бонусная посылка!':'Посылки отсортированы');
    if(!await animate(ANIM.notice,q=>draw(null,new Set(),{matches:removed,matchAlpha:.16+q*.19}),token))return;
    const dustPer=clamp(Math.floor(100/removed.size),1,5),dust=reduced?[]:[...removed].flatMap(k=>{const{x,y}=pos(k);return scatter(x,y,30,serial*31+combo*41+k,dustPer,false,old[k]);});
    if(!await animate(ANIM.clear,q=>{const f=easeInOut(q);const tiles=old.flatMap((t,k)=>t==null?[]:[{t,...pos(k),opacity:removed.has(k)?1-f:1,scale:removed.has(k)?1-.24*f:1}]);draw(tiles,new Set(),{matches:removed,matchAlpha:.31*(1-f),dust,elapsed:q*ANIM.clear});},token))return;
    for(const k of removed){const t=grid[k];if(t===RETURN)returns++;else if(t===SPOILED)spoiled++;else if(t===WRAPPED)wrapped++;else if(M.isNormal(t))normal++;grid[k]=null;}
    if(bonus>=0&&removed.has(bonus))grid[bonus]=GOLD;hud();
    const {next,motion}=M.fall(grid,LEVELS[level].types,tutorial?.rng??Math.random);if(!await animateFall(motion,token))return;grid=next;draw();
  }
  if(token!==serial)return;
  if(!tutorial&&!M.hint(grid)&&!won()&&moves>0){message('Нет ходов — новая раскладка.');const next=M.reshuffle(grid,LEVELS[level].types,Math.random);if(next){if(!await animate(ANIM.reshuffle,q=>draw(grid.map((t,k)=>({t,...pos(k),opacity:1-q}))),token))return;grid=next;}else{const l=LEVELS[level],remaining={...l,returns:l.returns-returns,spoiled:l.spoiled-spoiled,wrapped:l.wrapped-wrapped};grid=M.fillGrid(remaining,Math.random);}if(!await animate(ANIM.reshuffle*.75,q=>draw(grid.map((t,k)=>({t,...pos(k),opacity:easeOut(q)}))),token))return;draw();}
}
const specialCounts=()=>({returns,spoiled,wrapped});
function settledAction(token,accepted,before){
  if(token!==serial)return;busy=false;
  if(tutorial){
    if(accepted){
      if(!Object.values(remainingGoals()).some(Boolean)&&(!exercise()?.requireGold||bonusContinuation(grid,tutorial.rng.state()))){tutorial.complete=true;selected=-1;highlight=[];tool=null;message('Упражнение выполнено!');}
      else{startTutorial(tutorial.level,tutorial.step,tutorial.continuation);message('Попробуй ещё раз: '+trainingHint());return;}
    }
    hud();draw();notifyCheckpoint();return;
  }
  if(accepted&&level>=1){const l=LEVELS[level],result=[];if(returns>before.returns)result.push(`Возвраты ${returns}/${l.returns}`);if(spoiled>before.spoiled)result.push(`Порча ${spoiled}/${l.spoiled}`);if(wrapped>before.wrapped)result.push(`Связанные ${wrapped}/${l.wrapped}`);if(result.length)message(result.join(' · '));}
  if(won()||moves<=0)finish();else{hud();draw();notifyCheckpoint();}
}
async function attempt(a,b,from=0){
  if(busy||down||ended||campaignPaused||trainingDone()||!M.neighbors(a).includes(b))return;selected=-1;highlight=[];tool=null;canvas.style.cursor='grab';busy=true;hud();const token=serial,good=trainingSwap(a,b)&&M.legal(grid,a,b),held=from>0,before=specialCounts();
  if(good){
    if(!await swapAnim(a,b,token,from,1,held))return;M.exchange(grid,a,b);draw();if(!tutorial)moves--;hud();
    const gold=grid[a]===GOLD?a:grid[b]===GOLD?b:-1,other=gold===a?b:a,forced=gold>=0&&M.isNormal(grid[other])?grid.flatMap((t,k)=>t===grid[other]||k===gold?[k]:[]):[];
    await resolveBoard(token,forced);
  }else{
    // An invalid drag returns from the exact release position; a two-tap
    // attempt shows a short, reversible preview. Neither mutates the grid.
    if(canSlide(a,b)){if(held){if(!await swapAnim(a,b,token,from,0,true))return;}else{if(!await swapAnim(a,b,token,0,.64,false)||!await swapAnim(a,b,token,.64,0,false))return;}}
    message(tutorial?trainingHint():'Нужно собрать три одинаковые коробки.');
  }
  settledAction(token,good,before);
}
async function useTool(k){if(busy||down||ended||campaignPaused||trainingDone()||!tool)return;const good=trainingTool(tool,k)&&(tool==='mouse'&&mouse>0&&M.isNormal(grid[k])||tool==='moth'&&moth>0&&[SPOILED,WRAPPED].includes(grid[k]));if(!good){message(tutorial?trainingHint():tool==='mouse'?'Выбери обычную коробку.':'Выбери испорченную или связанную коробку.');return;}const before=specialCounts();if(tool==='mouse')mouse--;else moth--;tool=null;canvas.style.cursor='grab';selected=-1;highlight=[];busy=true;hud();const token=serial;await resolveBoard(token,[k]);settledAction(token,true,before);}
function showResult(){const victory=won();$('resultTitle').textContent=tr(victory?['Партия отправлена!','Все возвраты отправлены!','Завал разобран!'][level]:'Ходы закончились');$('resultText').textContent=tr(victory?`${level===0?'Посылки готовы к отправке.':'Все задания выполнены.'} Осталось ходов: ${moves}.`:'Попробуй ещё раз — выбирай комбинации ближе к нижнему ряду.');$('next').hidden=!victory||level===LEVELS.length-1;$('retry').hidden=!!campaignMode&&victory;$('overlay').hidden=false;}
function finish(){ended=true;const victory=won();if(victory&&completedStages===level)completedStages=level+1;hud();showResult();draw();const state=notifyCheckpoint();if(victory&&state)campaignMode?.onStageComplete?.(level,state);}
function copyContinuation(value){return value?{grid:value.grid.slice(),pair:value.pair.slice(),count:value.count,bonusType:value.bonusType,rngSeed:value.rngSeed}:null;}
function checkpoint(){if(busy||down||grid.length!==W*H||grid.some(t=>t==null)||M.matches(grid).size)return null;return {v:1,level,completedStages,moves,normal,returns,spoiled,wrapped,mouse,moth,grid:grid.slice(),ended,tutorial:tutorial?{level:tutorial.level,step:tutorial.step,complete:tutorial.complete,rngSeed:tutorial.rng.state(),continuation:copyContinuation(tutorial.continuation)}:null};}
function notifyCheckpoint(){const state=checkpoint();if(state)campaignMode?.onCheckpoint?.(state);return state;}
function restoreCheckpoint(input){
  let state=input;try{if(globalThis.PptMatchThreeCheckpoint?.validate)state=globalThis.PptMatchThreeCheckpoint.validate(input);
    if(!state||state.v!==1||!Number.isInteger(state.level)||!LEVELS[state.level]||!Array.isArray(state.grid)||state.grid.length!==W*H||!state.grid.every(t=>M.isNormal(t)||[RETURN,SPOILED,GOLD,WRAPPED].includes(t))||M.matches(state.grid).size||!Number.isInteger(state.completedStages)||state.completedStages<0||state.completedStages>LEVELS.length||!['moves','normal','returns','spoiled','wrapped','mouse','moth'].every(k=>Number.isInteger(state[k])&&state[k]>=0)||typeof state.ended!=='boolean')return false;
    if(state.tutorial){const t=state.tutorial;if(t.level!==state.level||!TRAINING[t.level]?.[t.step]||typeof t.complete!=='boolean'||!Number.isInteger(t.rngSeed)||t.rngSeed<0||t.rngSeed>0xffffffff||state.ended)return false;if(t.level===0&&t.step===2){const c=t.continuation;if(!c||!Array.isArray(c.grid)||!Array.isArray(c.pair)||!M.legal(c.grid,...c.pair)||c.grid[c.pair[0]]!==GOLD||c.grid[c.pair[1]]!==c.bonusType||c.count!==c.grid.filter(x=>x===c.bonusType).length)return false;}else if(t.continuation)return false;}
    // Validate and clone before changing the running presentation. The parent
    // campaign validator is stricter than the prototype fallback above.
    const t=state.tutorial?{level:state.tutorial.level,step:state.tutorial.step,complete:state.tutorial.complete,rng:trainingRng(state.tutorial.level,state.tutorial.step,state.tutorial.rngSeed),continuation:copyContinuation(state.tutorial.continuation)}:null,next=state.grid.slice();
    resetRun(state.level);completedStages=state.completedStages;moves=state.moves;normal=state.normal;returns=state.returns;spoiled=state.spoiled;wrapped=state.wrapped;mouse=state.mouse;moth=state.moth;grid=next;tutorial=t;ended=state.ended;message(tutorial?(trainingDone()?'Упражнение выполнено!':trainingHint()):battleIntro());hud();if(ended)showResult();draw();return true;
  }catch{return false;}
}
function setCampaignLanguage(lang){currentLang=lang==='en'?'en':'ru';globalThis.PptMatchThreeI18n?.apply(currentLang);hud();message(lastMessageRu);if(ended)showResult();draw();}
function setCampaignMode(options){campaignMode=options||null;campaignPaused=!!options?.paused;setCampaignLanguage(options?.lang??currentLang);}
function setCampaignPaused(paused){campaignPaused=!!paused;let released=false;if(campaignPaused&&down){const gesture=down;down=null;releaseCapture(gesture);selected=-1;highlight=[];canvas.style.cursor=tool?'crosshair':'grab';released=true;}hud();if(!busy)draw();if(released)notifyCheckpoint();}
function exitCampaign(){campaignMode?.onExit?.(checkpoint());}
function indexAt(e){const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*W),y=Math.floor((e.clientY-r.top)/r.height*H);return x>=0&&x<W&&y>=0&&y<H?y*W+x:-1;}
function releaseCapture(d){if(!d)return;try{if(!canvas.hasPointerCapture||canvas.hasPointerCapture(d.id))canvas.releasePointerCapture?.(d.id);}catch{/* pointer already ended */}}
function updateGesture(d,e){
  const r=canvas.getBoundingClientRect(),dx=(e.clientX-d.x)*W*P/r.width,dy=(e.clientY-d.y)*H*P/r.height;
  if(Math.max(Math.abs(dx),Math.abs(dy))>=ANIM.dragSlop)d.moved=true;
  if(d.tool||!d.moved)return;
  if(!d.axis){d.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';selected=-1;highlight=[];}
  const along=d.axis==='x'?dx:dy,step=d.axis==='x'?1:W,candidate=d.k+Math.sign(along)*step;
  // One locked axis, one adjacent target. Locked goods and the edge do not move.
  d.target=along!==0&&M.neighbors(d.k).includes(candidate)?candidate:-1;
  d.progress=d.target>=0&&canSlide(d.k,d.target)?clamp(Math.abs(along)/P):0;
}
function paintGesture(d){if(d.tool||!movable(grid[d.k])){draw();return;}const b=d.progress>0?d.target:-1;showPair(d.k,b,d.progress,1,b);}
function scheduleGesture(d){if(d.paintPending)return;d.paintPending=true;requestAnimationFrame(()=>{d.paintPending=false;if(down===d&&!busy&&!ended&&!campaignPaused)paintGesture(d);});}
async function rollbackGesture(d){
  if(d.target<0||d.progress<=0){if(tutorial&&d.moved)message(trainingHint());hud();draw();notifyCheckpoint();return;}
  busy=true;hud();const token=serial;if(!await swapAnim(d.k,d.target,token,d.progress,0,true))return;if(token!==serial)return;busy=false;if(tutorial)message(trainingHint());hud();draw();notifyCheckpoint();
}
function tap(k){
  const s=exercise();if(s&&(s.tool||!s.pair?.includes(k))){selected=-1;highlight=[];message(trainingHint());draw();return;}
  highlight=[];if(selected===k)selected=-1;else if(selected!==-1&&M.neighbors(selected).includes(k)){attempt(selected,k);return;}else selected=k;draw();
}
canvas.addEventListener('pointerdown',e=>{
  if(busy||ended||campaignPaused||trainingDone()||down||e.isPrimary===false||e.button>0)return;const k=indexAt(e);if(k<0)return;
  down={k,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,axis:null,target:-1,progress:0,tool,paintPending:false};
  try{canvas.setPointerCapture?.(e.pointerId);}catch{/* lost before capture */}canvas.style.cursor=tool?'crosshair':'grabbing';hud();paintGesture(down);
});
canvas.addEventListener('pointermove',e=>{const d=down;if(!d||d.id!==e.pointerId||busy||ended||campaignPaused)return;updateGesture(d,e);scheduleGesture(d);});
canvas.addEventListener('pointerup',e=>{
  const d=down;if(!d||d.id!==e.pointerId)return;updateGesture(d,e);down=null;releaseCapture(d);canvas.style.cursor=tool?'crosshair':'grab';if(busy||ended||campaignPaused)return;hud();
  if(d.tool){if(!d.moved&&indexAt(e)>=0)useTool(d.k);else draw();return;}
  if(d.moved){if(d.target>=0&&d.progress>=ANIM.commit){paintGesture(d);attempt(d.k,d.target,d.progress);}else rollbackGesture(d);return;}
  if(indexAt(e)<0){draw();return;}tap(d.k);
});
function cancelGesture(e){const d=down;if(!d||d.id!==e.pointerId)return;down=null;releaseCapture(d);canvas.style.cursor=tool?'crosshair':'grab';if(!busy&&!ended)rollbackGesture(d);}
canvas.addEventListener('pointercancel',cancelGesture);canvas.addEventListener('lostpointercapture',cancelGesture);
$('hint').onclick=()=>{if(busy||down||ended||campaignPaused||trainingDone())return;selected=-1;if(tutorial){highlight=[];message(trainingHint());}else{highlight=M.hint(grid,remainingGoals())||[];message(highlight.length?'Попробуй поменять выделенные коробки.':'Нет доступных совпадений.');}draw();};
$('restart').onclick=()=>{if(campaignPaused||campaignMode&&ended&&won())return;tutorial?startTutorial(tutorial.level,tutorial.step,tutorial.continuation):start(level);};$('retry').onclick=()=>{if(!campaignPaused&&!(campaignMode&&ended&&won()))start(level);};$('next').onclick=()=>{if(campaignPaused||campaignMode&&(!ended||!won()||level+1>=LEVELS.length))return;selectLevel(Math.min(level+1,LEVELS.length-1));};document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{if(!campaignMode)selectLevel(Number(b.dataset.level));});
$('tutorialAction').onclick=advanceTutorial;$('tutorialSkip').onclick=()=>{if(tutorial&&!busy&&!down&&!campaignPaused)start(tutorial.level);};
function goalIcons(){for(const [id,t] of [['normalIcon',0],['returnIcon',RETURN],['badIcon',SPOILED],['wrapIcon',WRAPPED]]){const g=$(id).getContext('2d');g.clearRect(0,0,56,56);box(g,t,28,28,43);}for(const [id,s] of [['mouseIcon',3],['mothIcon',4]]){const g=$(id).getContext('2d');g.clearRect(0,0,56,56);basementSprite(g,s,28,28,56);}}
for(const id of ['mouse','moth'])$(id).onclick=()=>{if(busy||down||ended||campaignPaused||trainingDone()||level!==2||exercise()&&exercise().tool!==id||!(id==='mouse'?mouse:moth)||!hasToolTarget(id))return;tool=tool===id?null:id;selected=-1;highlight=[];canvas.style.cursor=tool?'crosshair':'grab';message(tutorial?trainingHint():tool?(id==='mouse'?'Мышка: выбери обычную коробку.':'Моль: выбери испорченную или связанную коробку.'):'Выбери две соседние коробки.');hud();draw();};
const ready=Promise.all([...imgs,basement].map(i=>i.decode().catch(()=>{}))).then(()=>{prepareTileCache();goalIcons();if(!busy&&!down)draw();});selectLevel(0);
function gallery(){const c=document.createElement('canvas');c.width=960;c.height=1010;const g=c.getContext('2d');g.fillStyle='#101b27';g.fillRect(0,0,c.width,c.height);const text=(t,x,y,size=18,bold=false,colour='#fff5e7')=>{g.fillStyle=colour;g.font=`${bold?'800 ':'600 '}${size}px Nunito, sans-serif`;g.textAlign='center';g.fillText(tr(t),x,y);};const card=(x,y,w,h)=>{g.beginPath();g.roundRect(x,y,w,h,13);g.fillStyle='#243243';g.fill();g.strokeStyle='#5f6977';g.lineWidth=2;g.stroke();};text('МАГНАТ ПВЗ',480,35,17,true,'#e4bf80');text('Сортировочный центр — игровые элементы',480,72,27,true);const names=['Круг','Квадрат','Треугольник','Звезда'],colors=['Красный','Синий','Жёлтый','Зелёный'];for(let s=0;s<4;s++)text(names[s],260+s*177,115,20,true,'#e4bf80');for(let c1=0;c1<4;c1++){text(colors[c1],87,181+c1*147,20,true);for(let s=0;s<4;s++){const x=180+s*177,y=125+c1*147;card(x,y,160,133);box(g,TYPES.findIndex(t=>t.c===c1&&t.s===s),x+80,y+65,102);}}text('Специальные элементы из игры',480,741,23,true,'#e4bf80');const specs=[[RETURN,'Возврат'],[SPOILED,'Порча'],[WRAPPED,'Связанная'],[GOLD,'Бонусная']];for(let i=0;i<6;i++){const x=10+i*157,y=760;card(x,y,150,208);if(i<4){box(g,specs[i][0],x+75,y+83,115);text(specs[i][1],x+75,y+164,18,true);}else{basementSprite(g,i===4?3:4,x+75,y+83,122);text(i===4?'Мышка':'Моль',x+75,y+164,18,true);}}return c;}
// Read-only diagnostics and deterministic input for automated prototype checks.
globalThis.__matchPreview={state:()=>({grid:grid.slice(),level,moves,normal,returns,spoiled,wrapped,mouse,moth,tool,busy,ended,completedStages,tutorial:tutorial?{level:tutorial.level,step:tutorial.step,length:TRAINING[tutorial.level].length,complete:tutorial.complete,pair:exercise().pair??null,targets:exercise().targets.slice(),tool:exercise().tool??null,continuation:copyContinuation(tutorial.continuation)}:null,drag:down?{from:down.k,id:down.id,axis:down.axis,target:down.target,progress:down.progress,moved:down.moved}:null}),hint:()=>tutorial?exercise().pair??null:M.hint(grid,remainingGoals()),attempt:(a,b)=>attempt(a,b),start,selectLevel,ready,gallery,checkpoint,restoreCheckpoint,setCampaignMode,setCampaignPaused,setCampaignLanguage,exitCampaign};
})();
