// The five renovations are independent; tools and effects always inspect their own level.
globalThis.PptVillagePerks=(()=>{
  const style=(home,level)=>home?.choices?.[level-1];
  const has=(home,level,id)=>style(home,level)===id;
  function weather(day,event){
    if(event==='ny')return 'snow';
    return day%4===1?'rain':day%4===3?'cloud':'sun';
  }
  function upkeep(home,day,base=35,event=null){
    return Math.round(base*(has(home,4,'garden')&&weather(day,event)==='sun'?.8:1));
  }
  function gardenSales(home,random=Math.random){return has(home,5,'garden')?5+Math.floor(random()*11):0;}
  // A style set: every repair in a style the house already has adds SET_BONUS
  // to the cash at the end of each owned shift. Two cosy and three barn
  // repairs count as 1+2 extra pieces.
  const SET_BONUS=5;
  function setCounts(choices){
    const counts={};
    for(const id of Array.from(choices||[]))counts[id]=(counts[id]||0)+1;
    return counts;
  }
  function setPieces(home){
    return Object.values(setCounts(home?.choices)).reduce((sum,n)=>sum+Math.max(0,n-1),0);
  }
  function setBonus(home){return SET_BONUS*setPieces(home);}
  function rating(home,day,event){return has(home,1,'garden')&&weather(day,event)==='rain'?.2:0;}
  const slots={
    pallet:{level:1,style:'diy',capacity:1,xy:[105,454],name:['Поддон','Pallet']},
    attic:{level:1,style:'cozy',capacity:4,xy:[38,188],name:['Чердак','Attic']},
    ledge:{level:2,style:'diy',capacity:2,xy:[180,190],name:['Полка у стойки','Counter ledge']},
    cellar:{level:3,style:'cozy',capacity:3,xy:[112,401],name:['Погреб','Cellar']}
  };
  function boxes(home,id){
    const spec=slots[id];
    if(!spec||!has(home,spec.level,spec.style))return null;
    const state=home.storage||(home.storage={});
    return state[id]||(state[id]=[]);
  }
  function eachStored(home,fn){
    if(!home?.storage)return;
    for(const id of Object.keys(slots)){
      for(const b of home.storage[id]||[])fn(b,id==='cellar'||id==='attic'?'fridge':id);
    }
  }
  function findStored(home,need,clock,canTake){
    for(const id of ['ledge','cellar','pallet','attic']){
      const list=boxes(home,id);
      if(!list)continue;
      const index=list.findIndex(b=>!b.r&&b.ready<=clock&&need.some(n=>n.c===b.c&&n.s===b.s)&&canTake(b));
      if(index>=0)return {store:id,parcel:list[index]};
    }
    return null;
  }
  function store(home,id,parcel){
    const list=boxes(home,id);
    if(!list||list.length>=slots[id].capacity||!parcel||parcel.r||parcel.s>=4)return false;
    list.push(parcel);return true;
  }
  function remove(home,source){
    const list=boxes(home,source.store),index=list?.indexOf(source.parcel)??-1;
    if(index<0)return null;
    return list.splice(index,1)[0];
  }
  function storageTop(home,source){
    return boxes(home,source.store)?.includes(source.parcel)?source.parcel:null;
  }
  function moveStorage(home,next){
    if(!home?.storage)return;
    const cap=[3,5,8][next.up?.shelves||0];
    for(const id of Object.keys(slots)){
      const source=home.storage[id]||[];
      while(source.length){
        const b=source[0];
        const fridgeSlot=b.cold!=null?next.fridge.findIndex(v=>!v):-1;
        if(fridgeSlot>=0)next.fridge[fridgeSlot]=b;
        else{
          const shelf=next.stock[b.c][b.s];
          const dest=shelf.length<cap?shelf:next.floor.find(cell=>cell.length<3&&!cell.some(p=>p.s>=4));
          if(!dest)throw new Error('No destination for village inventory');
          dest.push(b);
        }
        b.ready=-1;source.shift();
      }
    }
  }
  function validateStorage(home){
    const state=home.storage;
    if(state===undefined)return;
    if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('Invalid village storage');
    const seen=new Set();
    for(const [id,spec] of Object.entries(slots)){
      const list=state[id];
      if(list===undefined)continue;
      if(!Array.isArray(list)||list.length>spec.capacity||list.length&&!has(home,spec.level,spec.style))throw new Error('Invalid village storage capacity');
      for(const b of list){
        if(!b||!Number.isInteger(b.c)||b.c<0||b.c>3||!Number.isInteger(b.s)||b.s<0||b.s>3||!Number.isFinite(b.ready)||seen.has(b))
          throw new Error('Invalid stored village parcel');
        seen.add(b);
      }
    }
    for(const key of ['returns','visitors','porchDays'])if(key in state&&(!Number.isSafeInteger(state[key])||state[key]<0))throw new Error('Invalid village counter');
  }
  function shelfSource(source){
    const [x,y]=slots[source.store].xy;
    return {x,y};
  }
  function begin(home,g,day,event){
    if(!home)return false;
    const storage=home.storage||(home.storage={});
    g.houseWeather=weather(day,event);
    g.houseRainWet=!style(home,1)&&g.houseWeather==='rain';
    if(!has(home,5,'diy'))return false;
    storage.porchDays=(storage.porchDays||0)+1;
    return storage.porchDays%3===0;
  }
  function grace(home,g){
    const porch=has(home,5,'cozy')?10:0;
    const stove=has(home,2,'cozy')&&['rain','snow'].includes(g.houseWeather)?20:0;
    return Math.max(porch,stove);
  }
  function patienceLoss(home,q,dt,comfort){
    if(!home)return dt*comfort;
    const protect=Math.min(q.houseGrace||0,dt);
    if(protect)q.houseGrace-=protect;
    return (dt-protect)*comfort*(style(home,2)?1:1.1);
  }
  function familyBonus(home,child){return child&&has(home,3,'garden')?20:0;}
  function radioPatience(home){return has(home,4,'cozy')&&home.radio==='patience'?1.1:1;}
  function routeSpeed(home,p){
    const radio=has(home,4,'cozy')&&home.radio!=='patience'?1.1:1;
    if(!has(home,3,'office'))return radio;
    // The painted path bends between the sorting aisle and the serving windows.
    const pathX=p.y>407?178:p.y<345?235:235-(p.y-345)*57/62;
    return radio*(Math.abs(p.x-pathX)<15?1.1:1);
  }
  function extraPay(home,holiday){return has(home,4,'diy')&&holiday?2:0;}
  function neighborReturn(home){
    if(!has(home,2,'garden'))return false;
    const storage=home.storage||(home.storage={});
    storage.returns=(storage.returns||0)+1;
    return storage.returns%5===0;
  }
  function hoist(home,truck,parcel,clock,shelf,cap,random=Math.random){
    if(!has(home,1,'barn')||!truck||truck.houseHoisted||!parcel||parcel.r||parcel.s>=4||parcel.f||parcel.cold!=null)return false;
    const index=truck.cargo.indexOf(parcel),cell=shelf(parcel.c,parcel.s);
    if(index<0||cell.length>=cap(parcel.c,parcel.s))return false;
    truck.cargo.splice(index,1);parcel.ready=clock+6+random()*10;cell.push(parcel);truck.houseHoisted=true;return true;
  }
  function callPrime(home,g,win,first){
    if(!has(home,4,'office')||win<first||g.q[win][0]?.claim)return;
    // Anyone already at their own window keeps it. Only call a guest waiting behind another guest.
    for(const line of g.q){
      const i=line.findIndex((q,k)=>k>0&&q.prime&&!q.claim&&q.state==='wait');
      if(i<0)continue;
      const q=line.splice(i,1)[0];g.q[win].unshift(q);q.win=win;q.state='in';
      g.houseCalledWindow=win;return q;
    }
  }
  function selectTruck(home,g){
    if(!has(home,5,'barn')||!g.houseSecondTruck)return false;
    if(g.truck)g.truck.houseStarted=true;
    [g.truck,g.houseSecondTruck]=[g.houseSecondTruck,g.truck];
    g.truck.houseStarted=true;
    return true;
  }
  function wetCells(home,g,stock,dt,spoil){
    if(!g.houseRainWet||!home||style(home,1))return;
    for(const cell of stock[0].slice(0,2))for(const b of cell){
      if(b.r)continue;
      b.houseWet=(b.houseWet||0)+dt;
      if(b.houseWet>=30)spoil(b);
    }
  }
  // Small fixed obstacles on the two accessible aisles. Move around the nearer edge of a
  // damaged board, leaving any intended interaction point reachable even when it is next to a hole.
  const holes=[[67,391],[280,441]];
  function floorWaypoint(home,o,x,y){
    if(!home||style(home,3))return null;
    const old=o.houseDetour;
    if(old&&old.tx===x&&old.ty===y&&Math.hypot(o.x-old.x,o.y-old.y)>1)return old;
    delete o.houseDetour;
    const dx=x-o.x,dy=y-o.y,len2=dx*dx+dy*dy;
    if(len2<400)return null;
    for(const [cx,cy] of holes){
      if(Math.hypot(cx-x,cy-y)<21)continue;
      const t=((cx-o.x)*dx+(cy-o.y)*dy)/len2;
      if(t<=0||t>=1||Math.hypot(o.x+t*dx-cx,o.y+t*dy-cy)>=13)continue;
      const len=Math.sqrt(len2),side=(dx*(cy-o.y)-dy*(cx-o.x))>0?-1:1;
      return o.houseDetour={tx:x,ty:y,x:cx-side*24*dy/len,y:cy+side*24*dx/len};
    }
    return null;
  }
  function toolAt(home,x,y){
    if(has(home,3,'barn')){
      for(let c=0;c<4;c++){
        const left=65+168*(c%2),top=360+84*Math.floor(c/2);
        if(x>=left&&x<=left+83&&y>=top&&y<=top+59)return 'sort:'+c;
      }
    }
    if(x>=65&&x<=146&&y>=350&&y<=452){
      if(has(home,3,'cozy'))return 'store:cellar';
      if(has(home,3,'diy'))return 'stash';
    }
    return null;
  }
  function toolsMenu(home,g,lang,icon,shelfFull){
    const en=lang==='en',label=(ru,eng)=>en?eng:ru;
    const buttons=[];
    const button=(v,title,disabled=false)=>'<button type="button" class="btn sec" data-a="houseTool" data-v="'+v+'"'+(disabled?' disabled':'')+'>'+title+'</button>';
    const held=g.p.hands[g.p.act],parcel=p=>icon(p);
    for(const [id,spec] of Object.entries(slots)){
      const list=boxes(home,id);
      if(!list)continue;
      buttons.push('<h3>'+spec.name[en?1:0]+' · '+list.length+'/'+spec.capacity+'</h3>');
      if(held)buttons.push(button('put:'+id,label('Положить','Store')+' '+parcel(held),held.r||held.s>=4||list.length>=spec.capacity));
      list.forEach((b,i)=>buttons.push(button('take:'+id+':'+i,label('Забрать','Collect')+' '+parcel(b))));
      if(!held&&!list.length)buttons.push('<p>'+label('Возьмите посылку и положите её сюда.','Carry a parcel here to store it.')+'</p>');
    }
    if(has(home,1,'barn')){
      buttons.push('<h3>'+label('Подъёмник','Hoist')+'</h3>');
      const tr=g.truck;
      if(!tr?.cargo?.length||tr.houseHoisted)buttons.push('<p>'+label('Доступен один раз за рейс, когда в фургоне есть обычная посылка.','Available once per delivery with an ordinary parcel aboard.')+'</p>');
      else tr.cargo.forEach((b,i)=>{if(!b.f&&!b.r&&b.cold==null&&b.s<4){
        const full=shelfFull(b);
        buttons.push(button('hoist:'+i,(full?label('Полка заполнена','Shelf full'):label('На полку','Send to shelf'))+' '+parcel(b),full));
      }});
    }
    if(has(home,3,'diy'))buttons.push(button('stash',label('Открыть тайник под фанерой','Open the floor stash'),!!g.houseStash));
    if(has(home,3,'barn')){
      const names=en?['Red','Blue','Yellow','Green']:['Красная','Синяя','Жёлтая','Зелёная'];
      buttons.push('<h3>'+label('Цветные площадки','Sorting bays')+'</h3>');
      names.forEach((s,i)=>buttons.push(button('sort:'+i,s,!g.p.hands.some(b=>b.c===i&&!b.r))));
    }
    if(has(home,5,'barn'))buttons.push(button('switch',label('Разгружать другой фургон','Unload the other van'),!g.houseSecondTruck));
    const ruWeather={sun:'солнечно',rain:'дождь',cloud:'пасмурно',snow:'снег'},enWeather={sun:'sunny',rain:'rain',cloud:'cloudy',snow:'snow'};
    return '<h2>'+label('Свой дом','Your pickup point')+'</h2><p>'+label('Сегодня','Today')+' · '+(en?enWeather:ruWeather)[g.houseWeather]+'</p>'+buttons.join('')+
      '<button type="button" class="btn" data-a="houseToolsClose">'+label('Вернуться в смену','Return to shift')+'</button>';
  }
  return {style,has,weather,upkeep,gardenSales,SET_BONUS,setCounts,setPieces,setBonus,rating,slots,boxes,eachStored,findStored,store,remove,storageTop,moveStorage,validateStorage,shelfSource,begin,grace,patienceLoss,
    familyBonus,radioPatience,routeSpeed,extraPay,neighborReturn,hoist,callPrime,selectTruck,wetCells,floorWaypoint,toolAt,toolsMenu};
})();
