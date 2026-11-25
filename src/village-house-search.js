// The paintings use a shared 1536 × 1024 coordinate system. Each prop is a removable
// layer cut from the approved painting (tools/build-search-props.py): it keeps its own
// place, pixels and contact shadow, so a find uncovers the empty room and nothing else.
// Six things hide behind bigger ones (coveredBy) and stand on a real surface there.
globalThis.PptVillageSearch=(()=>{
  const rooms=[
    {
      name:["Сени","Entryway"], alt:["Старинные сени с расписной лавкой, шкафом и лестницей.","An old entryway with a painted bench, cupboard and stairs."],
      result:["Ключ подошёл. Дверь в зал открыта.","The key fits. The hall door is open."], next:["Войти в зал","Enter the hall"],
      image:'assets/village-houses/clearing/entry-empty.webp', openImage:'assets/village-houses/clearing/entry-open.webp',
      items:[
        {id:'mitten', name:["Красная варежка","Red mitten"], image:'assets/village-houses/clearing/mitten.webp', x:378, y:622, w:172, h:106},
        {id:'hat', name:["Соломенная шляпа","Straw hat"], image:'assets/village-houses/clearing/hat.webp', x:528, y:81, w:100, h:104, coveredBy:'basket'},
        {id:'bell', name:["Ручной колокольчик","Handbell"], image:'assets/village-houses/clearing/bell.webp', x:1189, y:118, w:70, h:110},
        {id:'mug', name:["Синяя кружка","Blue mug"], image:'assets/village-houses/clearing/mug.webp', x:1320, y:672, w:136, h:112},
        {id:'brush', name:["Щётка","Brush"], image:'assets/village-houses/clearing/brush.webp', x:641, y:632, w:180, h:114},
        {id:'umbrella', name:["Зонт-трость","Umbrella"], image:'assets/village-houses/clearing/umbrella.webp', x:803, y:526, w:84, h:260},
        {id:'boot', name:["Чёрный ботинок","Black ankle boot"], image:'assets/village-houses/clearing/boot.webp', x:398, y:870, w:158, h:124},
        {id:'parcel', name:["Перевязанная посылка","Wrapped parcel"], image:'assets/village-houses/clearing/parcel.webp', x:827, y:840, w:192, h:174},
        {id:'leaf', name:["Кленовый лист","Maple leaf"], image:'assets/village-houses/clearing/leaf.webp', x:397, y:891, w:76, h:44, coveredBy:'boot'},
        {id:'pot', name:["Глиняный горшок","Clay pot"], image:'assets/village-houses/clearing/pot.webp', x:640, y:114, w:76, h:80},
        {id:'basket', name:["Плетёная корзинка","Wicker basket"], image:'assets/village-houses/clearing/basket.webp', x:524, y:90, w:186, h:102},
        {id:'knitting', name:["Сумка с вязанием","Knitting bag"], image:'assets/village-houses/clearing/knitting.webp', x:204, y:554, w:200, h:240},
        {id:'shoe', name:["Деревянный башмак","Wooden clog"], image:'assets/village-houses/clearing/shoe.webp', x:843, y:851, w:142, h:80, coveredBy:'parcel'},
        {id:'geranium', name:["Горшок с геранью","Potted geranium"], image:'assets/village-houses/clearing/geranium.webp', x:1401, y:328, w:130, h:160},
        {id:'key', name:["Старый ключ","Old key"], image:'assets/village-houses/clearing/key.webp', x:223, y:197, w:66, h:218}
      ]
    },
    {
      name:["Зал","Hall"], alt:["Деревянный зал с закрытыми ставнями, прилавком и полками.","A wooden hall with shutters, a counter and shelves."],
      result:["Ручка встала на место. Откроем ставни и осмотрим кладовую.","The brass handle fits. Open the shutters, then look in the storeroom."], next:["Войти в кладовую","Enter the storeroom"],
      image:'assets/village-houses/clearing/hall-empty.webp', openImage:'assets/village-houses/clearing/hall-open.webp',
      items:[
        {id:'scissors', name:["Большие ножницы","Large scissors"], image:'assets/village-houses/clearing/scissors.webp', x:478, y:170, w:136, h:218},
        {id:'twine', name:["Зелёный шпагат","Green twine"], image:'assets/village-houses/clearing/twine.webp', x:833, y:267, w:120, h:166},
        {id:'ruler', name:["Складной метр","Folding ruler"], image:'assets/village-houses/clearing/ruler.webp', x:1042, y:233, w:154, h:148},
        {id:'tile', name:["Синяя изразцовая плитка","Blue tile"], image:'assets/village-houses/clearing/tile.webp', x:531, y:552, w:112, h:100, coveredBy:'letters'},
        {id:'letters', name:["Письма в лотке","Letter tray"], image:'assets/village-houses/clearing/letters.webp', x:529, y:542, w:264, h:144},
        {id:'scales', name:["Чашечные весы","Balance scales"], image:'assets/village-houses/clearing/scales.webp', x:809, y:460, w:276, h:242},
        {id:'map', name:["Свёрнутая карта","Rolled map"], image:'assets/village-houses/clearing/map.webp', x:770, y:637, w:446, h:180},
        {id:'last', name:["Сапожная колодка","Wooden shoe last"], image:'assets/village-houses/clearing/last.webp', x:537, y:675, w:278, h:132},
        {id:'sack', name:["Мешок муки","Flour sack"], image:'assets/village-houses/clearing/sack.webp', x:1058, y:528, w:238, h:210},
        {id:'shell', name:["Морская ракушка","Seashell"], image:'assets/village-houses/clearing/shell.webp', x:1042, y:628, w:94, h:66},
        {id:'cameo', name:["Камея","Cameo brooch"], image:'assets/village-houses/clearing/cameo.webp', x:951, y:797, w:116, h:112},
        {id:'pegs', name:["Бельевые прищепки","Clothes pegs"], image:'assets/village-houses/clearing/pegs.webp', x:1327, y:756, w:144, h:94, coveredBy:'pitcher'},
        {id:'pitcher', name:["Эмалированный кувшин","Enamel jug"], image:'assets/village-houses/clearing/pitcher.webp', x:1369, y:681, w:266, h:296},
        {id:'flowers', name:["Красная герань","Red geranium"], image:'assets/village-houses/clearing/flowers.webp', x:110, y:532, w:220, h:332},
        {id:'handle', name:["Латунная ручка","Brass handle"], image:'assets/village-houses/clearing/handle.webp', x:243, y:633, w:190, h:96}
      ]
    },
    {
      name:["Кладовая","Storeroom"], alt:["Деревенская кладовая с сундуками, почтовыми полками и старым окном.","A storeroom with trunks, postal shelves and an old window."],
      result:["Вывеску можно вернуть на место. Дом расчищен!","The sign can go back up. The house is clear!"], next:["Закончить расчистку","Finish clearing"],
      image:'assets/village-houses/clearing/storeroom-empty.webp', openImage:'assets/village-houses/clearing/storeroom-empty.webp',
      items:[
        {id:'horseshoe', name:["Подкова","Horseshoe"], image:'assets/village-houses/clearing/horseshoe.webp', x:122, y:144, w:106, h:130},
        {id:'stamp', name:["Почтовый штамп","Postal stamp"], image:'assets/village-houses/clearing/stamp.webp', x:202, y:740, w:140, h:130},
        {id:'photo', name:["Старая фотография","Old photograph"], image:'assets/village-houses/clearing/photo.webp', x:787, y:294, w:140, h:112},
        {id:'yarn', name:["Красный клубок","Red ball of yarn"], image:'assets/village-houses/clearing/yarn.webp', x:688, y:806, w:244, h:116},
        {id:'broom', name:["Веник","Broom"], image:'assets/village-houses/clearing/broom.webp', x:1406, y:397, w:150, h:392},
        {id:'lantern', name:["Керосиновая лампа","Kerosene lantern"], image:'assets/village-houses/clearing/lantern.webp', x:761, y:123, w:94, h:176},
        {id:'satchel', name:["Кожаный портфель","Leather satchel"], image:'assets/village-houses/clearing/satchel.webp', x:248, y:555, w:282, h:188},
        {id:'bundle', name:["Связка писем","Bundle of letters"], image:'assets/village-houses/clearing/bundle.webp', x:351, y:613, w:142, h:70},
        {id:'sled', name:["Деревянные санки","Wooden sled"], image:'assets/village-houses/clearing/sled.webp', x:834, y:612, w:242, h:152},
        {id:'fruit', name:["Миска с яблоками","Bowl of apples"], image:'assets/village-houses/clearing/fruit.webp', x:451, y:404, w:108, h:68},
        {id:'quill', name:["Стакан с перьями","Quill cup"], image:'assets/village-houses/clearing/quill.webp', x:740, y:414, w:52, h:102},
        {id:'jack', name:["Подставка для сапога","Boot jack"], image:'assets/village-houses/clearing/jack.webp', x:1025, y:684, w:138, h:74},
        {id:'spool', name:["Катушка бечёвки","Spool of string"], image:'assets/village-houses/clearing/spool.webp', x:243, y:582, w:112, h:78, coveredBy:'satchel'},
        {id:'case', name:["Старый чемодан","Old suitcase"], image:'assets/village-houses/clearing/case.webp', x:1250, y:535, w:210, h:78},
        {id:'sign', name:["Эмалевая вывеска","Enamel sign"], image:'assets/village-houses/clearing/sign.webp', x:1294, y:806, w:238, h:274}
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
    // Preserve the saved order wherever possible. An older random plan may
    // request an item behind another one, so put all its covers before it.
    const ordered=new Set();
    for(const id of [...previous,...rest,finale]){
      for(const blocker of covers.get(id).slice().reverse())ordered.add(blocker);
      ordered.add(id);
    }
    return [...ordered];
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
    const found=new Set(state.found);
    const next=state.plan[state.room].find(id=>!found.has(id)&&covers.get(id).every(blocker=>found.has(blocker)));
    return next?[next]:[];
  }
  function isClearingComplete(raw){
    if(!raw||raw.room!==2||raw.plan?.length!==3)return false;
    return normaliseClearing(raw).found.length===45;
  }
  return Object.freeze({rooms,normaliseClearing,isClearingComplete,pending,layers});
})();
