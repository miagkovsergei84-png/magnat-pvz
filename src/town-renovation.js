// Permanent choices for the purchased town address. The work schedule is
// branch-local: one repair after each of the first five town shifts, with
// basement episodes before repairs I, III and V. Old active towns start the
// schedule at their current shift without losing prior campaign progress.
globalThis.PptTownRenovation=(()=>{
  const styles=['cozy','express','logistics'];
  const stages=[
    {ru:'Вход и холл',en:'Entrance and lobby',choices:[
      ['Скамейка с подставкой','Bench and parcel stand','После первой посылки гость с несколькими заказами получает ещё 12 секунд ожидания.','After the first parcel, a multi-order customer gets 12 extra seconds.'],
      ['Экспресс-окно','Express counter','Одно окно для гостей с одной посылкой; сложные заказы и возвраты обслуживают остальные окна.','One window is reserved for single-parcel pickups; other windows handle complex orders and returns.'],
      ['Приоритет возвратов','Returns priority','Одно окно отдаёт приоритет возвратам; свободное окно принимает обычные заказы.','One window prioritizes returns and handles ordinary orders when available.']]},
    {ru:'Стойка выдачи',en:'Service counter',choices:[
      ['Проверочный стол','Checking desk','Первую ошибочную выдачу за смену можно отменить без штрафа; посылка остаётся у сотрудника.','The first wrong delivery each shift is cancelled without a penalty; the parcel stays with the server.'],
      ['Терминал вызова','Call terminal','Кнопка направляет героя к первому гостю, чей заказ доступен на полке или верхушке стопки.','A button routes you to the first waiting customer with an accessible order.'],
      ['Стол комплектования','Packing table','За одну остановку у полки герой берёт несколько подходящих посылок в пределах тележки.','Collect several matching parcels from one shelf stop, within cart capacity.']]},
    {ru:'Подвал',en:'Basement',choices:[
      ['Резервный шкаф','Reserve cabinet','3 места для обычных посылок, которые можно сохранить до следующей смены.','3 regular parcel spots that persist between shifts.'],
      ['Полка у люка','Quick-access shelf','2 места для готовых заказов у стойки.','2 fast-access spots for prepared orders by the counter.'],
      ['Грузовая клетка','Cargo cage','6 временных мест для обычных коробок, чтобы освободить пол.','6 temporary spots for regular parcels to clear the floor.']]},
    {ru:'Возвраты',en:'Returns',choices:[
      ['Стол приёма','Returns desk','При полной тележке можно принять один возврат в отдельную ячейку.','Accept one return in a separate slot even with a full cart.'],
      ['Стойка возвратов','Returns rack','Принимай возвраты на стойку и забирай несколько за одну операцию.','Accept returns into the rack and collect several in one action.'],
      ['Отправочный стеллаж','Outbound rack','До 4 возвратов можно поставить в секции; следующий фургон заберёт их.','Stage up to 4 returns for the next arriving van.']]},
    {ru:'Двор и разгрузка',en:'Yard and unloading',choices:[
      ['Крытый навес','Covered porch','Один гость за смену, который собирается уйти, получает ещё 12 секунд.','One customer per shift about to leave gets 12 extra seconds.'],
      ['Диспетчерская доска','Dispatch board','Заранее показывает фактический состав следующей доставки.','Shows the actual contents of the next delivery in advance.'],
      ['Тележка выгрузки','Unloading cart','Раз за рейс две выбранные обычные коробки перемещаются в буфер у грузовой двери.','Once per van, move two selected regular parcels into the loading-door buffer.']]}
  ];
  const styleNames={cozy:['Уют','Comfort'],express:['Экспресс','Express'],logistics:['Логистика','Logistics']};
  const price=500,upkeep=45;
  const create=(startShift=0)=>({version:1,startShift,choices:[],episodes:[],buffer:[],returns:[],dock:[],finishedAt:null});
  const has=(home,level,style)=>home?.choices[level-1]===style;
  const capacity=(home,kind)=>kind==='buffer'?(has(home,3,'cozy')?3:has(home,3,'express')?2:has(home,3,'logistics')?6:0):kind==='returns'?(has(home,4,'cozy')?1:has(home,4,'express')||has(home,4,'logistics')?4:0):kind==='dock'&&has(home,5,'logistics')?2:0;
  const parcel=p=>p&&typeof p==='object'&&!Array.isArray(p)&&Number.isInteger(p.c)&&p.c>=0&&p.c<4&&Number.isInteger(p.s)&&p.s>=0&&p.s<=4&&Number.isFinite(p.ready);
  const ordinary=p=>parcel(p)&&!p.r&&p.s<4&&p.cold==null;
  function fits(home,kind,p){return !!home&&Array.isArray(home[kind])&&home[kind].length<capacity(home,kind)&&(kind==='returns'?parcel(p)&&!!p.r:ordinary(p));}
  function store(home,kind,p){if(!fits(home,kind,p)||home[kind].includes(p))return false;home[kind].push(p);return true;}
  function remove(home,kind,p){const i=home?.[kind]?.indexOf(p)??-1;if(i<0)return null;return home[kind].splice(i,1)[0];}
  function due(home,shifts){
    if(!home||home.choices.length===5)return null;
    const level=home.choices.length+1;if(shifts<home.startShift+level)return null;
    const episode=level===1?0:level===3?1:level===5?2:null;
    return episode!==null&&!home.episodes.includes(episode)?{kind:'basement',episode,level}:{kind:'repair',level};
  }
  function clear(home,episode,shifts){const work=due(home,shifts);if(work?.kind!=='basement'||work.episode!==episode)throw Error('Basement episode unavailable');home.episodes.push(episode);delete home.arcade;}
  function repair(home,level,style,shifts){const work=due(home,shifts);if(work?.kind!=='repair'||work.level!==level||!styles.includes(style))throw Error('Town repair unavailable');home.choices.push(style);if(level===5)home.finishedAt=shifts;}
  function validate(home){
    if(!home||home.version!==1||!Number.isSafeInteger(home.startShift)||home.startShift<0||!Array.isArray(home.choices)||home.choices.length>5||home.choices.some(x=>!styles.includes(x))||!Array.isArray(home.episodes)||home.episodes.length>3||home.episodes.some((x,i)=>x!==i)||home.episodes.length<Math.ceil(home.choices.length/2)||home.episodes.length>Math.ceil((home.choices.length+1)/2)||
      (home.choices.length===5?(!Number.isSafeInteger(home.finishedAt)||home.finishedAt<home.startShift+5):home.finishedAt!==null))throw Error('Invalid town renovation');
    const seen=new Set();for(const k of ['buffer','returns','dock']){
      if(!Array.isArray(home[k])||home[k].length>capacity(home,k))throw Error('Invalid town storage');
      for(const p of home[k]){if(seen.has(p)||(k==='returns'?!(parcel(p)&&p.r):!ordinary(p)))throw Error('Invalid town parcel');seen.add(p);}
    }
    if(home.arcade!==undefined)validateArcade(home.arcade,home.episodes.length);
  }
  function validateArcade(a,episode){
    const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi,number=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi,point=p=>p&&number(p.x,0,360)&&number(p.y,0,640);
    const count=[5,7,9][episode],kinds=[['box','box','box'],['box','box','mouse','moth'],['box','box','mouse','moth','mimic','mimic']][episode];
    if(!a||a.version!==1||a.episode!==episode||!count||!['intro','play','paused','won','lost'].includes(a.status)||!integer(a.lives,0,5)||!integer(a.score,0,count)||typeof a.help!=='boolean'||!number(a.elapsed,0,86400)||!number(a.cooldown,0,6)||!number(a.shield,0,3)||!point(a.player)||!['front','rear'].includes(a.player.facing)||typeof a.player.flip!=='boolean'||!Array.isArray(a.parcels)||a.parcels.length!==count||!Array.isArray(a.enemies)||a.enemies.length!==kinds.length||!Array.isArray(a.lampLit)||a.lampLit.length!==(episode?4:0)||a.lampLit.some(x=>typeof x!=='boolean')||JSON.stringify(a).length>60000)throw Error('Invalid arcade checkpoint');
    const patrol=p=>point(p)&&Array.isArray(p.points)&&p.points.length>0&&p.points.length<=40&&p.points.every(point)&&integer(p.idx,0,p.points.length-1)&&number(p.speed,10,100)&&[1,-1].includes(p.facing);
    for(const [i,p] of a.parcels.entries())if(!patrol(p)||p.id!==i||typeof p.delivered!=='boolean'||!number(p.protectedFor,0,7)||!(p.mouseId===null||integer(p.mouseId,0,kinds.length-1)))throw Error('Invalid arcade parcel');
    for(const [i,e] of a.enemies.entries())if(!patrol(e)||e.id!==i||e.kind!==kinds[i]||!['active','sleeping','warning'].includes(e.state)||!number(e.stun,0,4)||!number(e.rest,0,10)||!number(e.stealTime,0,10)||!number(e.wake,0,1)||!number(e.activeFor,0,10)||!(e.stolen===null||integer(e.stolen,0,count-1)))throw Error('Invalid arcade enemy');
    if(a.score!==a.parcels.filter(p=>p.delivered).length||(a.status==='won')!==(a.score===count)||(a.status==='lost')!==(a.lives===0)||!(a.player.carryId===null||integer(a.player.carryId,0,count-1)))throw Error('Invalid arcade progress');
    if(a.player.carryId!==null){const p=a.parcels[a.player.carryId];if(p.delivered||p.mouseId!==null)throw Error('Invalid carried parcel');}
    for(const p of a.parcels)if(p.mouseId!==null){if(p.delivered||a.enemies[p.mouseId].kind!=='mouse'||a.enemies[p.mouseId].stolen!==p.id)throw Error('Invalid stolen parcel');}
    for(const e of a.enemies)if(e.stolen!==null&&a.parcels[e.stolen].mouseId!==e.id)throw Error('Invalid mouse cargo');
  }
  function text(level,style,lang){const s=stages[level-1],i=styles.indexOf(style),v=s?.choices[i];if(!v)return null;const en=lang==='en';return {name:v[en?1:0],perk:v[en?3:2],style:styleNames[style][en?1:0],stage:s[en?'en':'ru']};}
  function eachStored(home,fn){if(!home)return;for(const kind of ['buffer','returns','dock'])for(const b of home[kind])fn(b,'town-'+kind);}
  function moveStorage(home,next){for(const k of ['buffer','dock'])while(home[k].length){const p=home[k][0],cell=next.stock[p.c][p.s],dest=cell.length<3?cell:next.floor.find(s=>s.length<3&&!s.some(b=>b.s===4));if(!dest)throw Error('No destination for town inventory');p.ready=-1;dest.push(p);home[k].shift();}next.heap=(next.heap||0)+home.returns.splice(0).length;}
  return Object.freeze({styles,stages,styleNames,price,upkeep,create,has,capacity,ordinary,fits,store,remove,due,clear,repair,validate,validateArcade,text,eachStored,moveStorage});
})();
