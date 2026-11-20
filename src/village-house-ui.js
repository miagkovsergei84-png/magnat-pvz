// The campaign owns purchases and saves. The search level only accepts a find
// once the campaign has saved the new plan and progress.
globalThis.VillageHouseUI = (() => {
  'use strict';
  const styles = ['diy', 'cozy', 'office', 'barn', 'garden'];
  const houses = ['linden', 'bakery', 'station'];
  const houseNames = [
    ['Дом у липы', 'Linden House'], ['Дом пекаря', 'Baker’s House'], ['Дом путейца', 'Track Keeper’s House']
  ];
  const houseNotes = [
    ['Резные наличники и крыльцо под старым деревом.', 'Carved window frames and a porch beneath the old tree.'],
    ['Кирпичная арка и труба от хлебной печи.', 'A brick arch and the chimney of the old bread oven.'],
    ['Длинная грузовая платформа с деревянным съездом.', 'A long loading platform with a wooden ramp.']
  ];
  const styleNames = [
    ['Своими руками', 'Handmade'], ['Деревенский уют', 'Country Comfort'], ['Почтовая контора', 'Post Office'],
    ['Почтовый амбар', 'Parcel Barn'], ['Дом с садом', 'Garden House']
  ];
  const levels = [
    ['Крыша', 'Roof', 'Закроем все дыры в старой кровле. Посылки у стены останутся сухими.', 'Seal the old roof so parcels beside the wall stay dry.'],
    ['Окна и стены', 'Windows and walls', 'Откроем зал для дневного света и избавимся от сквозняка.', 'Let daylight into the hall and keep out the draught.'],
    ['Пол', 'Floor', 'Заделаем все три пролома и освободим проход.', 'Repair all three holes and clear the walkway.'],
    ['Проводка и свет', 'Wiring and lights', 'Заменим старую проводку. Пробки больше не выбивает.', 'Replace the old wiring so the breakers stop tripping.'],
    ['Фасад и двор', 'Frontage and yard', 'Расчистим вход. Поток посетителей вернётся к обычному.', 'Clear the entrance and restore the usual flow of visitors.']
  ];
  // Entries hold the fixture name and the exact choice shown on the approved sheets.
  const options = [
    [
      ['Брезент и сухой поддон', 'Tarpaulin and pallet', 'Поддон даёт место ещё для одной коробки.', 'A dry pallet makes space for one extra parcel.'],
      ['Сухой чердак', 'Dry attic', 'Четыре посылки можно оставить до следующей смены.', 'Keep up to four parcels in the attic until the next shift.'],
      ['Мансардные окна', 'Skylights', 'При дневном свете герой берёт посылки с полок на 15% быстрее.', 'Daylight lets you pick up parcels from shelves 15% faster.'],
      ['Ручной подъёмник', 'Hand hoist', 'Раз за рейс отправьте обычную коробку из фургона прямо на подходящую полку, даже с полной тележкой.', 'Once per delivery, send one regular parcel directly to its matching shelf, even with a full cart.'],
      ['Водосток и бочка', 'Rain barrel', 'В дождливую смену сад прибавляет 0,2 звезды к рейтингу.', 'The garden adds 0.2 stars to your rating on rainy shifts.']
    ],
    [
      ['Полка у окна', 'Counter shelf', 'Две коробки можно заранее оставить у стойки для быстрой выдачи.', 'Set aside two parcels at the counter for pickup.'],
      ['Тёплая печка', 'Warm stove', 'В дождь и зимой гости первые 20 секунд ждут без потери терпения.', 'In rain or winter, guests keep their patience for the first 20 seconds.'],
      ['Оконное табло', 'Window timers', 'У каждого окна видно, сколько секунд готов ждать первый гость.', 'See how many seconds the first guest at each window will wait.'],
      ['Широкие ворота', 'Freight doors', 'Каждый фургон остаётся на разгрузке на 30 секунд дольше.', 'Each van stays for 30 extra seconds of unloading.'],
      ['Полка обмена', 'Exchange shelf', 'Соседи заберут каждый пятый возврат и заплатят за него $2.', 'Neighbours take every fifth return and pay $2 for it.']
    ],
    [
      ['Тайник под фанерой', 'Plywood cache', 'Раз в смену откройте тайник и найдите от $5 до $20.', 'Open the cache once per shift to find $5–20.'],
      ['Погреб под полом', 'Cellar hatch', 'Три места для посылок. Позднее в погребе можно хранить продукты без порчи.', 'Store three parcels in the cellar. Later it keeps groceries from spoiling.'],
      ['Размеченная дорожка', 'Marked walkway', 'На дорожке герой перемещается на 10% быстрее.', 'Walk 10% faster on the marked route.'],
      ['Площадки сортировки', 'Sorting bays', 'Нажмите на цветную площадку, чтобы разнести коробки этого цвета из тележки по подходящим ячейкам.', 'Tap a coloured bay to move matching parcels from your cart to available shelf slots.'],
      ['Детский коврик', 'Children’s play mat', 'Посетители с детьми готовы ждать на 20 секунд дольше.', 'Guests with children wait 20 seconds longer.']
    ],
    [
      ['Праздничная гирлянда', 'Festive lights', 'В праздничную смену каждая выданная посылка приносит ещё $2.', 'Earn an extra $2 per parcel handed out on holiday shifts.'],
      ['Абажуры и радио', 'Lamps and radio', 'Перед сменой выберите музыку. Бодрая повышает скорость героя на 10%, спокойная продлевает ожидание гостей на 10%.', 'Pick a tune before work. Lively music makes you 10% faster. Calm music makes guests wait 10% longer.'],
      ['Табло вызова', 'Priority display', 'Гость с короной переходит к первому свободному окну, когда оно освободится.', 'The next available window calls a waiting guest with a crown.'],
      ['Парные лампы', 'Paired work lights', 'Привезите посылки для двух центральных окон и обслужите обоих гостей за одну остановку.', 'Carry the right parcels for both centre windows and serve their guests in one stop.'],
      ['Солнечная панель', 'Solar panel', 'В солнечную смену содержание дома дешевле на 20%.', 'House upkeep costs 20% less on sunny shifts.']
    ],
    [
      ['Штакетник и вывеска', 'Fence and sign', 'Каждую третью смену после ремонта сосед бесплатно помогает разгружать фургоны.', 'Every third shift after this repair, a neighbour helps unload vans for free.'],
      ['Крыльцо со скамьёй', 'Porch bench', 'У крыльца гости первые 10 секунд ждут без потери терпения.', 'Guests keep their patience for the first 10 seconds at the porch.'],
      ['Велопарковка', 'Cycle parking', 'Каждый пятый гость забирает одну посылку сам, как только вы положите её на стойку. Оплата без чаевых.', 'Every fifth guest collects one parcel once you set it on the counter. The order pays without a tip.'],
      ['Два места для фургонов', 'Two loading spaces', 'Можно разгружать две машины. Вторая ждёт, пока вы не начнёте её разгружать или не уедет первая.', 'Unload from either of two vans. The second waits until you start unloading it or the first leaves.'],
      ['Ягодная лавка', 'Jam stall', 'Продажа варенья приносит от $5 до $15 за каждую отработанную смену.', 'Jam sales bring in $5–15 at the end of each shift.']
    ]
  ];

  const normaliseClearing = raw => globalThis.PptVillageSearch.normaliseClearing(raw);
  const isClearingComplete = raw => globalThis.PptVillageSearch.isClearingComplete(raw);
  function renovationLabel(home,lang) {
    const house = houses.indexOf(home?.house);
    const level = (home?.choices?.length || 0) - 1;
    const style = styles.indexOf(home?.choices?.[level]);
    const record = options[level]?.[style];
    if (house < 0 || !record) return null;
    const ix = lang === 'en' ? 1 : 0;
    return {house:houseNames[house][ix],level:levels[level][ix],style:styleNames[style][ix],name:record[ix],perk:record[ix+2]};
  }
  const scriptSrc = globalThis.document?.currentScript?.src;
  function scenePath(path) {
    return scriptSrc ? new URL('../' + path, scriptSrc).href : path;
  }
  // Transparent padding around a nearby prop must not steal a tap from the painted item underneath.
  const silhouettes = new WeakMap();
  function opaqueAt(image, x, y) {
    if (!image.complete || !image.naturalWidth) return false;
    if (!silhouettes.has(image)) {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1,192 / Math.max(image.naturalWidth,image.naturalHeight));
      canvas.width = Math.max(1,Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
      try {
        const ctx = canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        silhouettes.set(image,ctx.getImageData(0,0,canvas.width,canvas.height));
      } catch (_) {
        // A local file preview may disallow reading image pixels.
        silhouettes.set(image,null);
      }
    }
    const mask = silhouettes.get(image);
    if (!mask) return true;
    const pixel = Math.floor(y * mask.height) * mask.width + Math.floor(x * mask.width);
    return mask.data[4 * pixel + 3] >= 40;
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function button(className, text, act) {
    const el = node('button', className, text);
    el.type = 'button';
    el.addEventListener('click', act);
    return el;
  }
  let current = null;
  function close() {
    if (!current) return;
    const {dialog, returnFocus, observer} = current;
    observer?.disconnect();
    current = null;
    if (dialog.open && dialog.close) dialog.close();
    dialog.remove();
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
  }
  function show(config) {
    close();
    const ix = config.lang === 'en' ? 1 : 0;
    const t = (ru, en) => ix ? en : ru;
    const dialog = node('dialog', 'vhouse');
    const buying = config.kind === 'purchase';
    if (buying) dialog.classList.add('vhouse--offer');
    dialog.id = 'villageHouseDialog';
    dialog.lang = ix ? 'en' : 'ru';
    dialog.setAttribute('aria-labelledby', 'vhouseTitle');
    dialog.setAttribute('aria-modal', 'true');
    const pane = node('div', 'vhouse__pane');
    const head = node('header', 'vhouse__head');
    const title = node('h2', 'vhouse__title');
    title.id = 'vhouseTitle';
    title.tabIndex = -1;
    const summary = node('p', 'vhouse__summary');
    const main = node('div', 'vhouse__main');
    const status = node('p', 'vhouse__status');
    status.setAttribute('role','status');
    const actions = node('div','vhouse__actions');
    head.append(title, summary);
    pane.append(head, main, status, actions);
    dialog.append(pane);
    current = {dialog, kind:config.kind, returnFocus: document.activeElement};
    const alive = () => current?.dialog === dialog;
    let savedClearing = config.home?.clearing;
    function finish(cb, value) {
      if (!alive() || typeof cb !== 'function') return;
      close();
      let ok;
      try { ok = cb(value) !== false; } catch (_) { ok = false; }
      if (!ok && !current) {
        let retry = config;
        if (config.kind === 'clearing') retry = {...config,home:{...config.home,clearing:savedClearing}};
        if (buying && cb === config.onPurchase) retry = {...config,selectedHouse:value};
        show(retry);
        const errorStatus = document.querySelector('#villageHouseDialog .vhouse__status');
        errorStatus.classList.add('vhouse__status--error');
        errorStatus.textContent = saveError();
      }
    }
    function saveError() {
      return t('Не удалось сохранить. Повторите попытку.', 'Could not save. Please try again.');
    }
    const mayClose = typeof config.onClose === 'function' && (config.kind === 'purchase' || config.kind === 'radio' || config.deferRoof);
    if (mayClose) {
      const defer = buying ? t('Остаться в аренде','Keep renting') :
        config.deferRoof?t('Поработать одну смену до ремонта','Work one shift before repairing'):t('Назад','Back');
      const back = button('vhouse__quiet', defer, () => finish(config.onClose));
      if (buying && Number.isFinite(config.baseRent)) back.append(node('small','vhouse__rent',t('Базовая ставка $','Base rent $')+config.baseRent));
      actions.append(back);
    }
    dialog.addEventListener('cancel', e => { e.preventDefault(); if (mayClose) finish(config.onClose); });
    document.body.append(dialog);
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open','');
    title.focus({preventScroll:true});
    const art = globalThis.PptVillageHouseArt;
    const houseIndex = houses.indexOf(config.home?.house);
    const houseName = houseIndex >= 0 ? houseNames[houseIndex][ix] : '';
    function choiceCards(labels, choose, action) {
      const group = node('div','vhouse__grid');
      group.setAttribute('role',buying?'radiogroup':'group');
      group.setAttribute('aria-labelledby','vhouseTitle');
      let selected = null;
      const commit = button('vhouse__primary', action, () => {
        if (selected) finish(choose, selected.key);
      });
      commit.disabled = true;
      for (const [index,label] of labels.entries()) {
        const card = button('vhouse__choice', '', () => {
          const attr=buying?'aria-checked':'aria-pressed';
          for (const c of group.children) {
            c.setAttribute(attr,c===card?'true':'false');
            if (buying) c.tabIndex=c===card?0:-1;
          }
          selected = label;
          commit.disabled = false;
          commit.textContent = label.confirm || action + ' · ' + label.title;
        });
        card.dataset.choice = label.key;
        if (buying) {
          card.setAttribute('role','radio');
          card.setAttribute('aria-checked','false');
          card.tabIndex=index===0?0:-1;
          card.addEventListener('keydown',e=>{
            const last=labels.length-1;
            const targets={ArrowLeft:(index+last)%labels.length,ArrowUp:(index+last)%labels.length,
              ArrowRight:(index+1)%labels.length,ArrowDown:(index+1)%labels.length,Home:0,End:last};
            if (!Object.hasOwn(targets,e.key)) return;
            e.preventDefault();
            const next=group.children[targets[e.key]];
            next.focus();next.click();
          });
        } else card.setAttribute('aria-pressed','false');
        if (label.repairHome) {
          const pic=node('canvas','vhouse__pic vhouse__repair-pic');
          const level=label.repairHome.choices.length;
          pic.width=576;pic.height=Math.round(art.installationHeight(level)*pic.width/360);
          pic.setAttribute('aria-hidden','true');
          card.classList.add('vhouse__repair-choice');
          card.append(pic);
          art.paintRepairCard(pic,label.repairHome,level);
        } else if (label.img) {
          const pic = node('img','vhouse__pic');
          pic.src = label.img; pic.alt = ''; pic.decoding = 'async';
          card.append(pic);
        }
        const body = node('span','vhouse__copy');
        if (label.style) body.append(node('small','vhouse__style',label.style));
        body.append(node('strong','vhouse__label',label.title),node('span','vhouse__perk',label.perk));
        card.append(body);
        group.append(card);
        if (label.selected) card.click();
      }
      main.append(group);
      actions.prepend(commit);
    }
    if (config.kind === 'purchase') {
      title.textContent = t('Выберите дом для ПВЗ','Choose your pickup point');
      summary.textContent = t('Цена и выбор улучшений одинаковы для всех домов.','All three houses have the same price and repair options.');
      const confirm=ix?['Buy Linden House','Buy the Baker’s House','Buy the Track Keeper’s House']:
        ['Купить дом у липы','Купить дом пекаря','Купить дом путейца'];
      choiceCards(houses.map((key,i)=>({key,title:houseNames[i][ix],perk:houseNotes[i][ix],
        img:art?.thumbnail(key),confirm:confirm[i],selected:key===config.selectedHouse})),config.onPurchase,t('Купить дом','Buy house'));
      const p = typeof config.payment === 'object' && config.payment ? config.payment : {downPayment:config.payment};
      const facts = node('dl','vhouse__money');
      facts.setAttribute('aria-label',t('Условия покупки','Purchase terms'));
      const costs = [
        [t('Цена дома','House price'),p.price], [t('Взнос сегодня','Due today'),p.downPayment],
        [t('В рассрочку','On instalments'),p.debt], [t('Останется в кассе','Cash left'),p.balanceAfter]
      ];
      for (const [label,value] of costs) {
        if (!Number.isFinite(value)) continue;
        const pair = node('div');
        pair.append(node('dt','',label),node('dd','','$'+value.toLocaleString(ix?'en-US':'ru-RU')));
        facts.append(pair);
      }
      if (facts.children.length) main.append(facts);
      const terms=node('p','vhouse__terms');
      if(Number.isFinite(p.upkeep)) terms.append(node('span','',t(
        'Содержание $'+p.upkeep+' за смену. Аренда $0.','Upkeep $'+p.upkeep+' per shift. Rent $0.')));
      terms.append(node('span','',t('До четверти прибыли идёт на погашение долга.','Up to a quarter of shift profit repays the debt.')));
      main.append(terms);
    } else if (config.kind === 'repair') {
      dialog.classList.add('vhouse--repair');
      const row = Math.max(0,Math.min(4,Math.trunc(config.level || 1)-1));
      title.textContent = levels[row][ix];
      summary.textContent = houseName + ' · ' + t('Ремонт ','Repair ') + (row+1) + '/5. ' + levels[row][ix+2] + ' ' +
        t('Для этого уровня можно выбрать один вариант до конца прохождения.', 'Choose one option for this level for the rest of this run.');
      choiceCards(styles.map((key,i)=>{
        const item = options[row][i];
        const choices=[...config.home.choices.slice(0,row),key];
        return {key,style:styleNames[i][ix],title:item[ix],perk:item[ix+2],repairHome:{...config.home,choices}};
      }),config.onRepair,t('Установить','Install'));
    } else if (config.kind === 'radio') {
      title.textContent = t('Музыка на смену','Music for this shift');
      summary.textContent = houseName;
      choiceCards([
        {key:'speed',title:t('Бодрая','Lively'),perk:t('Герой ходит на 10% быстрее.','Walk 10% faster.'),selected:config.home.radio!=='patience'},
        {key:'patience',title:t('Спокойная','Calm'),perk:t('Гости готовы ждать на 10% дольше.','Guests wait 10% longer.'),selected:config.home.radio==='patience'}
      ],config.onRadio,t('Настроить радио','Tune the radio'));
    } else if (config.kind === 'clearing') {
      dialog.classList.add('vhouse--search');
      title.textContent = t('Расчистка дома','Clearing the house');
      const search = globalThis.PptVillageSearch;
      let state, zoom = 1;
      function persist(next, paint) {
        if (!alive()) return;
        try {
          if (config.onClearing?.(next) === false) throw new Error();
        } catch (_) {
          status.classList.add('vhouse__status--error');
          status.textContent = saveError();
          const retry = button('vhouse__quiet', t('Сохранить ещё раз','Retry save'), () => persist(next,paint));
          main.inert = true;
          actions.replaceChildren(retry);
          retry.focus();
          return;
        }
        state = next;
        savedClearing = next;
        main.inert = false;
        actions.replaceChildren();
        status.classList.remove('vhouse__status--error');
        status.textContent = '';
        paint();
      }
      function paintRoom() {
        current.observer?.disconnect();
        head.remove();
        dialog.setAttribute('aria-labelledby', 'vhouseRoomTitle');
        const room = search.rooms[state.room];
        const plan = state.plan[state.room];
        const last = plan[plan.length - 1];
        const roomCleared = () => plan.every(id => state.found.includes(id));
        const complete = roomCleared();
        const byId = new Map(room.items.map(item => [item.id,item]));
        const heading = node('header','vhouse__room-head');
        const roomTitle = node('h2','',room.name[ix]);
        roomTitle.id = 'vhouseRoomTitle';
        roomTitle.tabIndex = -1;
        const identity = node('div','vhouse__identity');
        const chapter = (state.room + 1) + '/' + search.rooms.length;
        identity.append(node('p','vhouse__location',houseName + ' · ' + chapter),roomTitle);
        const count = node('span','vhouse__count');
        const progress = node('div','vhouse__progress');
        const panHelp = node('small','vhouse__pan-help',t('Двигайте картинку','Drag to explore'));
        progress.append(count,panHelp);
        heading.append(identity,progress);
        function updateCount() {
          const n = plan.filter(id => state.found.includes(id)).length;
          count.textContent = t('Найдено ','Found ') + n + '/' + plan.length;
        }
        updateCount();
        const scene = node('div','vhouse__scene');
        const picture = node('img','vhouse__panorama');
        picture.alt = room.alt[ix];
        picture.src = scenePath(complete && room.openImage ? room.openImage : room.image);
        picture.draggable = false;
        scene.append(picture);
        const viewport = node('div','vhouse__viewport');
        viewport.tabIndex = 0;
        viewport.setAttribute('aria-label', t('Осмотрите комнату. Картинку можно двигать.', 'Explore the room. You can pan the picture.'));
        viewport.append(scene);
        const sidebar = node('div','vhouse__finds');
        const grid = node('div','vhouse__hunt');
        grid.append(viewport,sidebar);
        main.replaceChildren(heading,grid);
        roomTitle.focus({preventScroll:true});
        let sceneWidth = 0, viewWidth = 0, viewHeight = 0;
        function sizeScene() {
          // Use a single undistorted coordinate system for both the background and all items.
          const w = viewport.clientWidth, h = viewport.clientHeight;
          if (!w || !h) return;
          const cx = sceneWidth ? (viewport.scrollLeft + viewWidth / 2) / sceneWidth : .5;
          const cy = sceneWidth ? (viewport.scrollTop + viewHeight / 2) / (sceneWidth * 2 / 3) : .5;
          viewWidth = w; viewHeight = h;
          sceneWidth = Math.ceil(Math.max(w, h * 1.5) * zoom);
          panHelp.hidden = sceneWidth <= w + 1 && sceneWidth * 2 / 3 <= h + 1;
          scene.style.width = sceneWidth + 'px';
          scene.style.height = Math.ceil(sceneWidth * 2 / 3) + 'px';
          viewport.scrollLeft = cx * sceneWidth - w / 2;
          viewport.scrollTop = cy * sceneWidth * 2 / 3 - h / 2;
        }
        current.observer = new ResizeObserver(sizeScene);
        current.observer.observe(viewport);
        // Touch devices pan natively. A mouse drag pans either zoom level without collecting an item.
        let drag = null, ignoreClick = false;
        viewport.addEventListener('pointerdown', e => {
          ignoreClick = false;
          if (e.button === 0 && e.pointerType === 'mouse') {
            drag = {x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,id:e.pointerId};
          }
        });
        viewport.addEventListener('pointermove', e => {
          if (!drag || !e.buttons) { drag = null; return; }
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 5 || ignoreClick) {
            if (!ignoreClick) viewport.setPointerCapture(drag.id);
            ignoreClick = true;
            viewport.scrollLeft = drag.left - dx;
            viewport.scrollTop = drag.top - dy;
          }
        });
        viewport.addEventListener('pointerup', () => { drag = null; });
        viewport.addEventListener('pointercancel', () => { drag = null; ignoreClick = false; });
        viewport.addEventListener('click', e => {
          if (ignoreClick) { e.stopPropagation(); e.preventDefault(); ignoreClick = false; }
        },true);
        if (complete) {
          sidebar.append(node('p','vhouse__outcome',room.result[ix]));
          const next = button('vhouse__primary',room.next[ix],() => {
            if (state.room === search.rooms.length - 1) finish(config.onCleared);
            else persist({...state,room:state.room + 1},() => { zoom = 1; paintRoom(); });
          });
          sidebar.append(next);
          next.focus({preventScroll:true});
          sizeScene();
          return;
        }
        const goals = node('div','vhouse__goals');
        const goalTitle = node('h3','',t('Найдите','Find'));
        goalTitle.id = 'vhouseFindTitle';
        const list = node('ul','vhouse__targets');
        list.setAttribute('aria-labelledby',goalTitle.id);
        goals.append(goalTitle,list);
        const controls = node('div','vhouse__tools');
        const zoomText = node('span','vhouse__tool-text',t('Увеличить','Zoom in'));
        const zoomButton = button('vhouse__quiet vhouse__tool-zoom','',() => {
          zoom = zoom === 1 ? 2 : 1;
          zoomText.textContent = zoom === 1 ? t('Увеличить','Zoom in') : t('Уменьшить','Zoom out');
          zoomButton.title = zoomText.textContent;
          zoomButton.setAttribute('aria-label',zoomText.textContent);
          zoomButton.setAttribute('aria-pressed',String(zoom === 2));
          sizeScene();
        });
        zoomButton.title = zoomText.textContent;
        zoomButton.setAttribute('aria-label',zoomText.textContent);
        zoomButton.append(zoomText);
        zoomButton.setAttribute('aria-pressed','false');
        const hint = button('vhouse__quiet vhouse__tool-hint','',() => {
          const id = search.pending(state)[0];
          const target = buttons.get(id);
          if (!target) return;
          scene.querySelector('.vhouse__hot--hint')?.classList.remove('vhouse__hot--hint');
          target.classList.add('vhouse__hot--hint');
          viewport.scrollLeft = target.offsetLeft - viewport.clientWidth / 2;
          viewport.scrollTop = target.offsetTop - viewport.clientHeight / 2;
          status.textContent = t('Подсвечено: ','Look in the ring for: ') + byId.get(id).name[ix] + '.';
        });
        hint.title = t('Подсказка','Hint');
        hint.setAttribute('aria-label',hint.title);
        hint.append(node('span','vhouse__tool-text',hint.title));
        controls.append(zoomButton,hint);
        heading.append(controls);
        sidebar.append(goals);
        const buttons = new Map();
        function atPointer(e, fallback) {
          if (!e.detail || buttons.get(fallback)?.classList.contains('vhouse__hot--hint')) return fallback;
          for (const [id, hit] of Array.from(buttons).reverse()) {
            const r = hit.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
            if (x >= 0 && y >= 0 && x < 1 && y < 1 && opaqueAt(hit.firstChild,x,y)) return hit.disabled ? null : id;
          }
          return null;
        }
        function paintItems() {
          const ids = search.pending(state);
          for (const [id, hit] of buttons) {
            if (state.found.includes(id)) {
              hit.remove();
              buttons.delete(id);
            } else {
              hit.disabled = !ids.includes(id);
              if (hit.disabled) hit.setAttribute('aria-hidden','true');
              else hit.removeAttribute('aria-hidden');
            }
          }
          list.replaceChildren(...ids.map(id => node('li',id === last ? 'vhouse__story' : '',byId.get(id).name[ix])));
        }
        function collect(e, id) {
          const picked = atPointer(e,id);
          if (!alive() || !search.pending(state).includes(picked)) return;
          const wasKeyboard = e.detail === 0;
          persist({...state,found:[...state.found,picked]},() => {
            if (roomCleared()) { zoom = 1; paintRoom(); return; }
            paintItems();
            updateCount();
            status.textContent = t('Найдено: ','Found: ') + byId.get(picked).name[ix] + '.';
            if (wasKeyboard) buttons.get(search.pending(state)[0])?.focus({preventScroll:true});
          });
        }
        for (const item of search.layers(state)) {
          const hit = button('vhouse__hot','',e => collect(e,item.id));
          hit.dataset.item = item.id;
          hit.setAttribute('aria-label',item.name[ix]);
          hit.style.left = (100 * item.x / 1536) + '%';
          hit.style.top = (100 * item.y / 1024) + '%';
          hit.style.width = (100 * item.w / 1536) + '%';
          hit.style.height = (100 * item.h / 1024) + '%';
          const sprite = node('img','vhouse__item');
          sprite.src = scenePath(item.image);
          sprite.alt = '';
          sprite.draggable = false;
          hit.append(sprite);
          scene.append(hit);
          buttons.set(item.id,hit);
        }
        paintItems();
        sizeScene();
        // Present the whole stack together even if a front object takes longer to download.
        viewport.setAttribute('aria-busy','true');
        hint.disabled = true;
        status.textContent = t('Загружается комната…','Loading the room…');
        viewport.dataset.loading=status.textContent;
        Promise.all(Array.from(scene.querySelectorAll('img'), image => image.decode())).then(() => {
          if (!alive() || !scene.isConnected) return;
          viewport.removeAttribute('aria-busy');
          delete viewport.dataset.loading;
          hint.disabled = false;
          status.textContent = '';
        }).catch(() => {
          if (!alive() || !scene.isConnected) return;
          delete viewport.dataset.loading;
          status.classList.add('vhouse__status--error');
          status.textContent = t('Не удалось загрузить комнату.','Could not load the room.');
          actions.replaceChildren(button('vhouse__quiet',t('Загрузить ещё раз','Retry loading'),() => {
            actions.replaceChildren();
            status.classList.remove('vhouse__status--error');
            paintRoom();
          }));
        });
      }
      const raw=config.home?.clearing;
      const restored=normaliseClearing(raw);
      if(JSON.stringify(raw)===JSON.stringify(restored)){state=restored;paintRoom();}
      else persist(restored,paintRoom);
    }
    return dialog;
  }
  return {show,close,isOpen:()=>!!current,isSearching:()=>current?.kind === 'clearing',normaliseClearing,isClearingComplete,renovationLabel};
})();
