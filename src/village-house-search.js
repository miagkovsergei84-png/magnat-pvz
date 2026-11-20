// The paintings use a shared 1536 × 1024 coordinate system. Each prop is a removable layer.
globalThis.PptVillageSearch=(()=>{
  const rooms=[
    {
      name:["Сени","Entryway"], alt:["Старинные сени с расписной лавкой, шкафом и лестницей.","An old entryway with a painted bench, cupboard and stairs."],
      result:["Ключ подошёл. Дверь в зал открыта.","The key fits. The hall door is open."], next:["Войти в зал","Enter the hall"],
      image:'assets/village-houses/clearing/entry-empty.webp', openImage:'assets/village-houses/clearing/entry-open.webp',
      items:[
        {id:'mitten', name:["Красная варежка","Red mitten"], image:'assets/village-houses/clearing/mitten.webp', x:836, y:819, w:123, h:61, coveredBy:'parcel'},
        {id:'hat', name:["Соломенная шляпа","Straw hat"], image:'assets/village-houses/clearing/hat.webp', x:544, y:114, w:104, h:116, coveredBy:'basket'},
        {id:'bell', name:["Ручной колокольчик","Handbell"], image:'assets/village-houses/clearing/bell.webp', x:1196, y:118, w:84, h:125},
        {id:'mug', name:["Синяя кружка","Blue mug"], image:'assets/village-houses/clearing/mug.webp', x:1328, y:672, w:138, h:118},
        {id:'brush', name:["Щётка","Brush"], image:'assets/village-houses/clearing/brush.webp', x:647, y:626, w:176, h:125},
        {id:'umbrella', name:["Зонт-трость","Umbrella"], image:'assets/village-houses/clearing/umbrella.webp', x:809, y:524, w:92, h:290},
        {id:'boot', name:["Чёрный ботинок","Black ankle boot"], image:'assets/village-houses/clearing/boot.webp', x:413, y:841, w:166, h:143},
        {id:'parcel', name:["Перевязанная посылка","Wrapped parcel"], image:'assets/village-houses/clearing/parcel.webp', x:836, y:795, w:191, h:188},
        {id:'leaf', name:["Кленовый лист","Maple leaf"], image:'assets/village-houses/clearing/leaf.webp', x:413, y:869, w:82, h:46, coveredBy:'boot'},
        {id:'pot', name:["Глиняный горшок","Clay pot"], image:'assets/village-houses/clearing/pot.webp', x:398, y:600, w:167, h:174},
        {id:'basket', name:["Плетёная корзинка","Wicker basket"], image:'assets/village-houses/clearing/basket.webp', x:544, y:99, w:247, h:155},
        {id:'knitting', name:["Сумка с вязанием","Knitting bag"], image:'assets/village-houses/clearing/knitting.webp', x:212, y:550, w:155, h:207},
        {id:'shoe', name:["Деревянный башмак","Wooden clog"], image:'assets/village-houses/clearing/shoe.webp', x:1120, y:741, w:152, h:87},
        {id:'geranium', name:["Горшок с геранью","Potted geranium"], image:'assets/village-houses/clearing/geranium.webp', x:1398, y:326, w:145, h:167},
        {id:'key', name:["Старый ключ","Old key"], image:'assets/village-houses/clearing/key.webp', x:212, y:591, w:41, h:111, coveredBy:'knitting'}
      ]
    },
    {
      name:["Зал","Hall"], alt:["Деревянный зал с закрытыми ставнями, прилавком и полками.","A wooden hall with shutters, a counter and shelves."],
      result:["Скоба встала на место. Откроем ставни и осмотрим кладовую.","The brass pull fits. Open the shutters, then look in the storeroom."], next:["Войти в кладовую","Enter the storeroom"],
      image:'assets/village-houses/clearing/hall-empty.webp', openImage:'assets/village-houses/clearing/hall-open.webp',
      items:[
        {id:'scissors', name:["Большие ножницы","Large scissors"], image:'assets/village-houses/clearing/scissors.webp', x:480, y:169, w:155, h:232},
        {id:'twine', name:["Зелёный шпагат","Green twine"], image:'assets/village-houses/clearing/twine.webp', x:835, y:270, w:137, h:213},
        {id:'ruler', name:["Складной метр","Folding ruler"], image:'assets/village-houses/clearing/ruler.webp', x:1041, y:234, w:171, h:147},
        {id:'cameo', name:["Камея","Cameo brooch"], image:'assets/village-houses/clearing/cameo.webp', x:524, y:548, w:58, h:61, coveredBy:'tile'},
        {id:'pitcher', name:["Эмалированный кувшин","Enamel jug"], image:'assets/village-houses/clearing/pitcher.webp', x:1369, y:678, w:273, h:299},
        {id:'shell', name:["Морская ракушка","Seashell"], image:'assets/village-houses/clearing/shell.webp', x:1072, y:544, w:97, h:68, coveredBy:'sack'},
        {id:'last', name:["Сапожная колодка","Wooden shoe last"], image:'assets/village-houses/clearing/last.webp', x:503, y:662, w:268, h:142},
        {id:'letters', name:["Письма в лотке","Letter tray"], image:'assets/village-houses/clearing/letters.webp', x:524, y:538, w:276, h:155},
        {id:'pegs', name:["Бельевые прищепки","Clothes pegs"], image:'assets/village-houses/clearing/pegs.webp', x:503, y:678, w:106, h:72, coveredBy:'last'},
        {id:'map', name:["Свёрнутая карта","Rolled map"], image:'assets/village-houses/clearing/map.webp', x:788, y:645, w:410, h:169},
        {id:'tile', name:["Синяя изразцовая плитка","Blue tile"], image:'assets/village-houses/clearing/tile.webp', x:524, y:548, w:92, h:96, coveredBy:'letters'},
        {id:'sack', name:["Мешок муки","Flour sack"], image:'assets/village-houses/clearing/sack.webp', x:1072, y:510, w:237, h:230},
        {id:'scales', name:["Чашечные весы","Balance scales"], image:'assets/village-houses/clearing/scales.webp', x:806, y:447, w:292, h:265},
        {id:'flowers', name:["Красная герань","Red geranium"], image:'assets/village-houses/clearing/flowers.webp', x:108, y:521, w:213, h:336},
        {id:'handle', name:["Латунная ручка-скоба","Brass window pull"], image:'assets/village-houses/clearing/handle.webp', x:788, y:645, w:123, h:46, coveredBy:'map'}
      ]
    },
    {
      name:["Кладовая","Storeroom"], alt:["Деревенская кладовая с сундуками, почтовыми полками и старым окном.","A storeroom with trunks, postal shelves and an old window."],
      result:["Вывеску можно вернуть на место. Дом расчищен!","The sign can go back up. The house is clear!"], next:["Закончить расчистку","Finish clearing"],
      image:'assets/village-houses/clearing/storeroom-empty.webp', openImage:'assets/village-houses/clearing/storeroom-empty.webp',
      items:[
        {id:'horseshoe', name:["Подкова","Horseshoe"], image:'assets/village-houses/clearing/horseshoe.webp', x:130, y:142, w:123, h:143},
        {id:'stamp', name:["Почтовый штамп","Postal stamp"], image:'assets/village-houses/clearing/stamp.webp', x:258, y:531, w:75, h:68, coveredBy:'bundle'},
        {id:'photo', name:["Старая фотография","Old photograph"], image:'assets/village-houses/clearing/photo.webp', x:775, y:280, w:174, h:130},
        {id:'yarn', name:["Красный клубок","Red ball of yarn"], image:'assets/village-houses/clearing/yarn.webp', x:696, y:800, w:249, h:128},
        {id:'broom', name:["Веник","Broom"], image:'assets/village-houses/clearing/broom.webp', x:1413, y:391, w:164, h:416},
        {id:'lantern', name:["Керосиновая лампа","Kerosene lantern"], image:'assets/village-houses/clearing/lantern.webp', x:785, y:108, w:126, h:200},
        {id:'satchel', name:["Кожаный портфель","Leather satchel"], image:'assets/village-houses/clearing/satchel.webp', x:261, y:509, w:294, h:232},
        {id:'bundle', name:["Связка писем","Bundle of letters"], image:'assets/village-houses/clearing/bundle.webp', x:261, y:534, w:160, h:106, coveredBy:'satchel'},
        {id:'sled', name:["Деревянные санки","Wooden sled"], image:'assets/village-houses/clearing/sled.webp', x:829, y:609, w:244, h:147},
        {id:'fruit', name:["Миска с яблоками","Bowl of apples"], image:'assets/village-houses/clearing/fruit.webp', x:447, y:393, w:123, h:72},
        {id:'quill', name:["Стакан с перьями","Quill cup"], image:'assets/village-houses/clearing/quill.webp', x:715, y:406, w:68, h:109},
        {id:'jack', name:["Подставка для сапога","Boot jack"], image:'assets/village-houses/clearing/jack.webp', x:1015, y:689, w:145, h:77},
        {id:'spool', name:["Катушка бечёвки","Spool of string"], image:'assets/village-houses/clearing/spool.webp', x:785, y:131, w:68, h:48, coveredBy:'lantern'},
        {id:'case', name:["Старый чемодан","Old suitcase"], image:'assets/village-houses/clearing/case.webp', x:1222, y:536, w:299, h:157},
        {id:'sign', name:["Эмалевая вывеска","Enamel sign"], image:'assets/village-houses/clearing/sign.webp', x:1220, y:543, w:108, h:111, coveredBy:'case'}
      ]
    }
  ];
  function makePlan(room,old) {
    const finale=room.items.at(-1).id, all=room.items.slice(0,-1).map(item=>item.id);
    const known=new Set(all);
    const previous=Array.isArray(old)?[...new Set(old.filter(id=>known.has(id)))]:[];
    const rest=all.filter(id=>!previous.includes(id));
    for(let i=rest.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [rest[i],rest[j]]=[rest[j],rest[i]];
    }
    return [...previous,...rest,finale];
  }
  function normaliseClearing(raw){
    const plan=rooms.map((room,i)=>makePlan(room,raw?.plan?.[i]));
    const saved=new Set(Array.isArray(raw?.found)?raw.found:[]), credited=new Set();
    let room=0;
    for(const [i,ids] of plan.entries()){
      const old=raw?.plan?.[i];
      // A finished five-find room from an earlier edition stays finished.
      const legacyDone=old?.length===5&&old.includes(ids.at(-1))&&old.every(id=>ids.includes(id)&&saved.has(id));
      for(const id of ids)if(legacyDone||saved.has(id))credited.add(id);
      if(!legacyDone&&!ids.every(id=>saved.has(id)))break;
      if(i>=2||!(raw?.room>i))break;
      room++;
    }
    const found=[...saved].filter(id=>credited.delete(id));
    return {plan,room,found:found.concat([...credited])};
  }
  // Every object has a fixed place from the first frame. Draw the contents of
  // a stack before the item in front of them, regardless of journal hint order.
  const covers=new Map();
  const stacks=rooms.map(room=>{
    const ordered=[];
    function place(item,blockers){
      covers.set(item.id,blockers);
      for(const behind of room.items.filter(other=>other.coveredBy===item.id))place(behind,[item.id,...blockers]);
      ordered.push(item);
    }
    for(const item of room.items.filter(item=>!item.coveredBy))place(item,[]);
    return ordered;
  });
  function layers(state){
    return stacks[state.room].filter(item=>!state.found.includes(item.id));
  }
  function pending(state){
    const visible=new Set(layers(state).filter(item=>covers.get(item.id).every(id=>state.found.includes(id))).map(item=>item.id));
    return state.plan[state.room].filter(id=>visible.has(id));
  }
  function isClearingComplete(raw){
    if(!raw||raw.room!==2||raw.plan?.length!==3)return false;
    return normaliseClearing(raw).found.length===45;
  }
  return Object.freeze({rooms,normaliseClearing,isClearingComplete,pending,layers});
})();
