// Match-three translations are independent of the model, checkpoint and UI state.
// Game messages always arrive in their original Russian form; only presentation
// changes language. Exact static translations preserve every nested UI node.
(function(root){
  'use strict';
  const pairs=[
    // Shell, navigation and compact mobile controls.
    ['Магнат ПВЗ — Сортировочный центр','Pickup Point Tycoon — Sorting center'],
    ['МАГНАТ ПВЗ','PICKUP POINT TYCOON'],
    ['Сортировочный центр','Sorting center'],
    ['ТРЕНИРОВКА','TRAINING'],['БОЕВАЯ ПАРТИЯ','BATTLE ROUND'],
    ['ХОДЫ','MOVES'],['Звёзды','Stars'],['Этапы','Stages'],
    ['1. Партия','1. First batch'],['2. Возвраты','2. Returns'],['3. Завал','3. Backlog'],
    ['Первая партия','First batch'],['Возвраты','Returns'],['Завал на складе','Stockroom backlog'],
    ['Памятка ↓','Rules ↓'],['Задание ↓','Task ↓'],['К полю ↑','Back to board ↑'],
    ['Задачи партии','Round objectives'],
    ['Сортируй одинаковые по цвету и знаку коробки','Sort parcels of the same color and symbol'],
    ['Собрать посылки','Sort parcels'],
    ['Опусти возвраты до нижней линии','Drop returns to the bottom row'],
    ['Спустить возвраты','Drop returns'],
    ['Собери тройку по стороне рядом с порчей','Make a match beside a damaged parcel'],
    ['Убрать порчу','Clear damaged'],
    ['Собери тройку по стороне рядом со связанной коробкой','Make a match beside a tied parcel'],
    ['Освободить связанные','Free tied parcels'],
    ['Игровое поле: удерживайте и перетаскивайте коробки пальцем или выберите две соседние','Game board: drag a parcel or select two neighboring parcels'],
    ['Далее','Next'],['Повторить','Retry'],['Начать боевую партию','Start the round'],
    ['↓ Нижний ряд — отправка возвратов','↓ Bottom row sends returns'],
    ['Нижняя опора игрового поля','Board support'],
    ['Учебная партия','Training round'],['ШАГ 1/4','STEP 1/4'],['Разбери завал','Clear the backlog'],
    ['Пропустить','Skip'],['Памятка партии','Round guide'],['ПАМЯТКА ПАРТИИ','ROUND GUIDE'],
    ['Удерживай коробку и тяни к соседней или нажми на две подряд. Совпадать должны и цвет, и знак.','Drag one parcel to its neighbor or tap both. Match both color and symbol.'],
    ['Четыре в ряд дают бонусную посылку.','Four in a row create a bonus parcel.'],
    ['Четыре в ряд дают золотую посылку.','Four in a row create a bonus parcel.'],
    ['Возвраты отправляются из нижнего ряда.','Returns leave from the bottom row.'],
    ['Тройка рядом по стороне убирает порчу и связанные.','A match beside damaged or tied parcels clears them.'],
    ['Помощники','Helpers'],['ПОМОЩНИКИ · БЕЗ РАСХОДА ХОДА','HELPERS · FREE ACTION'],
    ['Выбери мышку, затем обычную коробку','Choose the mouse, then a regular parcel'],
    ['Мышка','Mouse'],['Убирает обычную коробку','Clears a regular parcel'],
    ['Осталось зарядов','Charges left'],
    ['Выбери моль, затем испорченную или связанную коробку','Choose the moth, then a damaged or tied parcel'],
    ['Моль','Moth'],['Убирает порчу или связанную','Clears damaged or tied'],
    ['Появятся в третьей партии — «Завал».','Available in round 3 — Backlog.'],
    ['На этом шаге помощники не требуются.','No helpers are needed in this step.'],
    ['Подсказка','Hint'],['Заново','Restart'],['Как играть?','How to play?'],
    ['Удерживай коробку и тяни к соседней или нажми на две соседние. Для тройки должны совпасть и цвет коробки, и фигура.','Drag a parcel to its neighbor or tap two adjacent parcels. A match requires the same color and shape.'],
    ['Возврат отправляется, когда достигает нижнего ряда.','A return is sent when it reaches the bottom row.'],
    ['Порча и связанные коробки уходят при совпадении рядом по стороне. Эти коробки нельзя менять местами.','Damaged and tied parcels disappear when a match is made directly beside them. They cannot be swapped.'],
    ['Мышка убирает выбранную обычную коробку, моль — порчу или связанную. Каждый помощник используется один раз и не расходует ход.','The mouse clears a chosen regular parcel; the moth clears a damaged or tied parcel. Each helper can be used once without spending a move.'],
    ['Бонусная посылка и обычная коробка удаляют с поля коробки того же цвета и фигуры.','Swap a bonus parcel with a regular parcel to clear every parcel of that color and shape.'],
    ['Золотая посылка и обычная коробка удаляют с поля коробки того же цвета и фигуры.','Swap a bonus parcel with a regular parcel to clear every parcel of that color and shape.'],
    // Training exercises and context-sensitive prompts.
    ['Собери тройку','Make a match of three'],
    ['Перетащи одну выделенную коробку к другой или нажми обе по очереди. Собери три коробки одного цвета и с одинаковым знаком: совпадения исчезнут, остальные упадут.','Drag one highlighted parcel to the other, or tap both in turn. Match three of the same color and symbol: they will disappear and the others will fall.'],
    ['Поменяй две подсвеченные коробки.','Swap the two highlighted parcels.'],
    ['Отлично! Три одинаковые коробки собраны, а новые заполнили свободные клетки.','Great! Three matching parcels are sorted and new parcels fill the gaps.'],
    ['Создай бонусную посылку','Create a bonus parcel'],
    ['Поменяй выделенную пару. Четыре одинаковые коробки в ряд образуют бонусную посылку.','Swap the highlighted pair. Four identical parcels in a row create a bonus parcel.'],
    ['Замени выделенную коробку, чтобы собрать четыре в ряд.','Swap the highlighted parcel to make a row of four.'],
    ['Бонусная посылка создана! На следующем шаге попробуй её использовать.','Bonus parcel created! Try using it in the next step.'],
    ['Используй бонусную посылку','Use the bonus parcel'],
    ['Поменяй бонусную посылку с выделенной обычной коробкой. Все посылки именно этого цвета и знака исчезнут одновременно.','Swap the bonus parcel with the highlighted regular one. Every parcel of that color and symbol will disappear at once.'],
    ['Поменяй бонусную посылку с подсвеченной обычной.','Swap the bonus parcel with the highlighted regular one.'],
    ['Бонусная посылка убрала все коробки выбранного вида. Теперь можно начинать первую партию!','The bonus parcel cleared all parcels of the chosen kind. You are ready for the first round!'],
    ['Отправь возврат','Send a return'],
    ['Поменяй выделенную пару. Тройка уберёт опору под возвратом, и он упадёт на нижнюю линию отправки.','Swap the highlighted pair. The match removes the support below the return and it falls to the bottom dispatch row.'],
    ['Убери опору под возвратом, поменяв выделенную пару.','Swap the highlighted pair to remove the support below the return.'],
    ['Возврат принят на нижней линии. В партии нужно отправить три возврата, отдельного счётчика обычных посылок нет.','The return reached the bottom row. Send three returns in the round; regular parcels have no separate target.'],
    ['Расчисти завал','Clear the blockage'],
    ['Перетащи одну выделенную коробку к другой или нажми обе по очереди. Тройка одного цвета и знака уберёт препятствия по стороне. Их нельзя менять местами.','Drag one highlighted parcel to the other, or tap both in turn. A match of three sharing a color and symbol clears adjacent obstacles. Obstacles cannot be swapped.'],
    ['Оба препятствия убраны! Тройка рядом очищает то, что нельзя поменять местами.','Both obstacles are clear! A match beside them removes parcels that cannot be swapped.'],
    ['Возврат принят на нижней линии. Освобождай клетки под ним, чтобы отправить следующие возвраты.','The return reached the bottom row. Clear the cells beneath other returns to send them too.'],
    ['Попробуй Мышку','Try the mouse'],
    ['Выбери Мышку, затем коробку под возвратом. Она уберёт опору без обмена и траты хода.','Choose the mouse, then the parcel below the return. It removes the support without swapping or spending a move.'],
    ['Сначала нажми кнопку Мышки.','Tap the mouse button first.'],
    ['Теперь нажми подсвеченную коробку под возвратом.','Now tap the highlighted parcel below the return.'],
    ['Мышка убрала опору и помогла отправить возврат. В боевой партии такой помощник доступен один раз.','The mouse removed the support and helped send the return. You can use this helper once per round.'],
    ['Попробуй Моль','Try the moth'],
    ['Выбери Моль, затем связанную коробку в рамке. Моль убирает связанную или испорченную коробку без траты хода.','Choose the moth, then the highlighted tied parcel. The moth clears a tied or damaged parcel without spending a move.'],
    ['Сначала нажми кнопку Моли.','Tap the moth button first.'],
    ['Теперь нажми подсвеченную связанную коробку.','Now tap the highlighted tied parcel.'],
    ['Готово! В боевой партии отправляй возвраты и убирай порчу и связанные коробки. Обычные посылки служат для расчистки пути.','Ready! Send returns and clear damaged and tied parcels. Use regular parcels to clear a path.'],
    ['Смотри, как помощник освобождает клетку, а коробки падают.','Watch the helper clear the cell and the parcels fall.'],
    // Round messages, overlays and canvas gallery.
    ['Собери три одинаковые коробки по цвету и фигуре.','Match three parcels of the same color and shape.'],
    ['Опусти все возвраты до нижней границы, освобождая путь.','Clear a path and drop all returns to the bottom row.'],
    ['Спускай возвраты и освобождай препятствия — это и есть задачи партии.','Drop returns and clear obstacles to complete the round.'],
    ['Четыре в ряд — бонусная посылка!','Four in a row — a bonus parcel!'],
    ['Посылки отсортированы','Parcels sorted'],['Нет ходов — новая раскладка.','No moves — reshuffling the board.'],
    ['Упражнение выполнено!','Exercise complete!'],
    ['Нужно собрать три одинаковые коробки.','Make a match of three identical parcels.'],
    ['Выбери обычную коробку.','Choose a regular parcel.'],['Выбери испорченную или связанную коробку.','Choose a damaged or tied parcel.'],
    ['Партия отправлена!','Batch dispatched!'],['Все возвраты отправлены!','All returns dispatched!'],['Завал разобран!','Backlog cleared!'],
    ['Ходы закончились','Out of moves'],['Посылки готовы к отправке.','Parcels are ready to dispatch.'],['Все задания выполнены.','All tasks are complete.'],
    ['Попробуй ещё раз — выбирай комбинации ближе к нижнему ряду.','Try again — make matches closer to the bottom row.'],
    ['Попробуй поменять выделенные коробки.','Try swapping the highlighted parcels.'],['Нет доступных совпадений.','No available matches.'],
    ['Мышка: выбери обычную коробку.','Mouse: choose a regular parcel.'],['Моль: выбери испорченную или связанную коробку.','Moth: choose a damaged or tied parcel.'],
    ['Выбери две соседние коробки.','Choose two neighboring parcels.'],
    ['Сортировочный центр — игровые элементы','Sorting center — game elements'],
    ['Круг','Circle'],['Квадрат','Square'],['Треугольник','Triangle'],['Звезда','Star'],
    ['Красный','Red'],['Синий','Blue'],['Жёлтый','Yellow'],['Зелёный','Green'],
    ['Специальные элементы из игры','Special game elements'],['Возврат','Return'],['Порча','Damaged'],['Связанная','Tied'],['Связанные','Tied parcels'],['Бонусная','Bonus'],
    ['Вернуться в ПВЗ','Back to the pickup point'],['Вернуться','Back'],['Пауза','Paused'],['Продолжить','Resume'],
    ['Сохранение…','Saving…'],['Не удалось сохранить прогресс. Попробуй ещё раз.','Could not save progress. Try again.'],
    ['Повторить сохранение','Retry saving'],['Сохранение прогресса…','Saving progress…'],
    ['Не удалось сохранить прогресс. Повтори попытку.','Could not save progress. Please retry.'],
    ['Не удалось восстановить сортировочный центр. Вернись в ПВЗ.','Could not restore the sorting center. Return to the pickup point.'],
    ['Загрузка сортировочного центра…','Loading the sorting center…']
  ];
  const dictionary=Object.freeze(Object.fromEntries(pairs));
  function text(value,lang='ru'){
    if(lang!=='en'||typeof value!=='string'||!value)return value;
    if(Object.hasOwn(dictionary,value))return dictionary[value];
    let m;
    if((m=/^Шаг (\d+) из (\d+)$/.exec(value)))return `Step ${m[1]} of ${m[2]}`;
    if((m=/^Комбо ×(\d+)!$/.exec(value)))return `Combo ×${m[1]}!`;
    if((m=/^✓ (.+)$/.exec(value)))return `✓ ${text(m[1],lang)}`;
    if((m=/^Попробуй ещё раз: (.+)$/.exec(value)))return `Try again: ${text(m[1],lang)}`;
    if((m=/^(.+\.) Осталось ходов: (\d+)\.$/.exec(value)))return `${text(m[1],lang)} Moves left: ${m[2]}.`;
    if((m=/^(Возвраты|Порча|Связанные) (\d+\/\d+)$/.exec(value)))return `${text(m[1],lang)} ${m[2]}`;
    if(value.includes(' · '))return value.split(' · ').map(part=>text(part,lang)).join(' · ');
    return value; // numbers, symbols and technical messages are never altered
  }
  const attrs=['aria-label','title','placeholder'];
  const originals=new WeakMap();
  function apply(lang='ru',document=root.document){
    const normalized=lang==='en'?'en':'ru';
    if(!document?.documentElement)return;
    document.documentElement.lang=normalized;
    function applyNode(node){
      if(node.nodeType===3){
        const current=node.nodeValue;
        const content=current?.trim();
        if(!content)return;
        let original=originals.get(node);
        if(!original||current!==original.last){
          // Dynamic text is rendered again by the controller after a language
          // change. Do not freeze its first value or replace nested elements.
          if(!Object.hasOwn(dictionary,content))return;
          original={source:current,last:current};originals.set(node,original);
        }
        const prior=original.source,trimmed=prior.trim(),translated=prior.replace(trimmed,text(trimmed,normalized));
        node.nodeValue=translated;original.last=translated;return;
      }
      if(node.nodeType===1){
        if(['SCRIPT','STYLE','TEXTAREA','NOSCRIPT'].includes(node.tagName))return;
        let original=originals.get(node);
        if(!original){original={};originals.set(node,original);}
        for(const attr of attrs){
          const current=node.getAttribute?.(attr);if(!current)continue;
          let stored=original[attr];if(!stored||stored.last!==current){if(!Object.hasOwn(dictionary,current))continue;stored={source:current,last:current};original[attr]=stored;}
          const translated=text(stored.source,normalized);node.setAttribute(attr,translated);stored.last=translated;
        }
      }
      for(const child of Array.from(node.childNodes??[]))applyNode(child);
    }
    applyNode(document.documentElement);
  }
  root.PptMatchThreeI18n=Object.freeze({text,apply,dictionary});
})(globalThis);
