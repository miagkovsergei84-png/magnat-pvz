// Presentation-only screens of away shifts. Inputs are plain data; no game
// state is mutated and all dynamic text is escaped before insertion.
globalThis.PptPostgameUI = (() => {
  const words = {
    ru: {
      journey: 'Путешествие', rank: 'Звание', points: 'Очки признания', trips: 'Выездов', nextRank: 'до следующего звания', topRank: 'высшее звание',
      ranks: ['Гость на выезде', 'Надёжный сосед', 'Любимец округи', 'Легенда доставки'],
      hubHelp: 'Выберите место на одну смену. Дни, проведённые на выезде, тоже открывают улучшения в магазине.',
      hubBusy: 'В столице ещё идёт смена. В путешествие можно отправиться, когда оба ПВЗ закроют смену.',
      back: 'Назад', toCapital: 'Вернуться в столицу',
      returnTrip: 'Вернуться', shop: 'Магазин', manageTeam: 'Команда', toBrief: 'К подготовке',
      preparation: 'Покупки и тренировки оплачиваются из общей кассы и сохраняются для следующих смен.',
      training: 'Тренировать скорость', maxSpeed: 'Максимальная скорость', crewHint: 'Найм и тренировка скорости стоят одну дневную зарплату сотрудника. За завершённый выезд команда получает опыт.',
      changePlace: 'Выбрать другое место', resume: 'Продолжить смену', menu: 'В меню',
      tracking: 'Цели выезда', holding: 'Соблюдается', achieved: 'Выполнено', missed: 'Не выполнено', running: 'В процессе',
      counts: {noAngry:'Недовольных клиентов', fewMistakes:'Ошибок', unloadAll:'Посылок уехало обратно', noBroken:'Разбитых посылок'},
      places: { village: 'Деревня', town: 'Городок', city: 'Мегаполис · Окраина', 'city-center': 'Мегаполис · Центр' },
      placeNotes: { village: 'Тихий пункт, знакомые лица.', town: 'Больше посетителей и возвратов.', city: 'Плотный поток и личные проверки заказов.', 'city-center': 'Самый оживлённый пункт. Здесь может работать постамат.' },
      away: 'Выезд', level: 'Уровень смены', levels: { calm: 'Спокойно', normal: 'Обычно', challenge: 'Испытание' },
      goals: 'Цели смены', main: 'основная', extra: 'дополнительная',
      rewardNote: 'Награда: {0} за основную цель и по одному очку за каждую дополнительную. Премия — {1}% выручки смены, не больше {2}. Невыполненная цель ничего не отнимает.',
      team: 'Ваша команда с окраины столицы', teamNone: 'В этом ПВЗ пока нет сотрудников. Вы едете самостоятельно.', kit: 'На выезде доступны улучшения вашего ПВЗ с окраины столицы.',
      locked: 'Здесь не работают', income: 'Выручка, аренда и зарплаты смены остаются местному пункту.',
      start: 'Открыть смену', result: 'Итоги выезда', served: 'Выдано посылок', personal: 'Из них лично', revenue: 'Выручка пункта',
      earned: 'Очки признания', bonus: 'Премия', total: 'Всего очков признания', newRank: 'Новое звание', nextDay: 'Следующий день',
      saveFailed: 'Не удалось записать награду. Проверьте доступ к хранилищу и повторите.', retry: 'Повторить запись', leave: 'Вернуться без награды',
      abortTitle: 'Прервать выезд?', abortText: 'Смена не будет засчитана, награды не будет. Столица останется такой, какой вы её оставили.', abortYes: 'Прервать выезд', abortNo: 'Продолжить смену',
      point: n => n + ' ' + plural('ru', n, ['очко', 'очка', 'очков', 'очка']),
      served_goal: n => 'Выдать ' + n + ' ' + plural('ru', n, ['посылку', 'посылки', 'посылок', 'посылки']),
      personal_goal: n => 'Выдать лично ' + n + ' ' + plural('ru', n, ['посылку', 'посылки', 'посылок', 'посылки']),
      checks_goal: n => 'Лично проверить ' + n + ' ' + plural('ru', n, ['заказ', 'заказа', 'заказов', 'заказа']) + ' с отметкой !',
      noAngry: 'Ни одного злого клиента', fewMistakes: 'Не больше одной ошибки при выдаче',
      unloadAll: 'Разгрузить все грузовики до конца смены', noBroken: 'Не разбить ни одной посылки'
    },
    en: {
      journey: 'Journey', rank: 'Rank', points: 'Recognition points', trips: 'Trips', nextRank: 'to the next rank', topRank: 'top rank',
      ranks: ['Visiting helper', 'Trusted neighbour', 'Local favourite', 'Delivery legend'],
      hubHelp: 'Choose a destination for one shift. Each completed trip counts as one day towards unlocking shop upgrades.',
      hubBusy: 'A capital shift is still running. You can travel once both pickup points have closed their shift.',
      back: 'Back', toCapital: 'Return to the capital',
      returnTrip: 'Return', shop: 'Shop', manageTeam: 'Team', toBrief: 'Back to preparation',
      preparation: 'Upgrades and training use your shared funds and carry over to future shifts.',
      training: 'Train speed', maxSpeed: 'Maximum speed', crewHint: 'Hiring or speed training costs one day of that employee’s wages. Your team earns experience for each completed trip.',
      changePlace: 'Choose another destination', resume: 'Resume shift', menu: 'Main menu',
      tracking: 'Trip goals', holding: 'On track', achieved: 'Complete', missed: 'Missed', running: 'In progress',
      counts: {noAngry:'Angry customers', fewMistakes:'Mistakes', unloadAll:'Parcels sent back', noBroken:'Broken parcels'},
      places: { village: 'Village', town: 'Town', city: 'City · Outskirts', 'city-center': 'City · Downtown' },
      placeNotes: { village: 'A quiet point with familiar faces.', town: 'More customers and returns.', city: 'A dense flow and personal order checks.', 'city-center': 'The busiest point. A parcel locker can work here.' },
      away: 'Away shift', level: 'Shift level', levels: { calm: 'Calm', normal: 'Regular', challenge: 'Challenge' },
      goals: 'Shift goals', main: 'main', extra: 'extra',
      rewardNote: 'Reward: {0} for the main goal and one point for each extra goal. Bonus: {1}% of the shift revenue, up to {2}. A missed goal takes nothing away.',
      team: 'Your team from the capital outskirts', teamNone: 'This pickup point has no employees yet. You’re travelling solo.', kit: 'You bring the upgrades from your pickup point on the outskirts.',
      locked: 'Not available here', income: 'Revenue, rent and wages of this shift stay with the local point.',
      start: 'Start shift', result: 'Away shift results', served: 'Parcels handed out', personal: 'By you', revenue: 'Point revenue',
      earned: 'Recognition points', bonus: 'Bonus', total: 'Total recognition points', newRank: 'New rank', nextDay: 'Next day',
      saveFailed: 'The reward could not be saved. Check your browser storage and try again.', retry: 'Try saving again', leave: 'Return without the reward',
      abortTitle: 'End the away shift?', abortText: 'The shift will not count and there will be no reward. The capital stays exactly as you left it.', abortYes: 'End away shift', abortNo: 'Continue shift',
      point: n => n + ' ' + (n === 1 ? 'point' : 'points'),
      served_goal: n => 'Hand out ' + n + ' ' + (n === 1 ? 'parcel' : 'parcels'),
      personal_goal: n => 'Hand out ' + n + ' ' + (n === 1 ? 'parcel' : 'parcels') + ' yourself',
      checks_goal: n => 'Personally check ' + n + ' ' + (n === 1 ? 'order' : 'orders') + ' marked !',
      noAngry: 'No angry customers', fewMistakes: 'At most one handout mistake',
      unloadAll: 'Unload every truck before the shift ends', noBroken: 'Break no parcels'
    }
  };
  const rules = { ru: new Intl.PluralRules('ru') };
  function plural(lang, n, forms) {
    const category = rules[lang].select(n);
    return forms[category === 'one' ? 0 : category === 'few' ? 1 : category === 'many' ? 2 : 3];
  }
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  const locale = lang => lang === 'ru' ? words.ru : words.en;
  const fill = (text, values) => text.replace(/\{(\d+)\}/g, (token, i) => values[i] ?? token);
  function button(name, label, kind = 'primary', value, extra = '') {
    return '<button type="button" class="campaignButton campaignButton--' + kind + '" data-a="' + name + '"' +
      (value === undefined ? '' : ' data-v="' + escape(value) + '"') + extra + '>' + label + '</button>';
  }
  function goalText(lang, goal) {
    const w = locale(lang), id = goal?.id;
    if (id === 'served') return w.served_goal(goal.target);
    if (id === 'personal') return w.personal_goal(goal.target);
    if (id === 'checks') return w.checks_goal(goal.target);
    return Object.prototype.hasOwnProperty.call(w, id) && typeof w[id] === 'string' ? w[id] : '';
  }
  function placeName(lang, location) { return locale(lang).places[location] || ''; }
  function rankName(lang, index) { return locale(lang).ranks[index] || ''; }
  function status(lang, {points = 0, trips = 0, rankIndex = 0, nextRank = null} = {}) {
    const w = locale(lang);
    return '<p class="postgameStatus"><b>' + escape(w.rank) + ':</b> ' + escape(rankName(lang, rankIndex)) + ' · <b>' + escape(w.points) + ':</b> ' + escape(points) +
      ' <small>(' + escape(nextRank === null ? w.topRank : (nextRank - points) + ' ' + w.nextRank) + ')</small> · <b>' + escape(w.trips) + ':</b> ' + escape(trips) + '</p>';
  }
  function hub({lang = 'en', points = 0, trips = 0, rankIndex = 0, nextRank = null, locations = [], busy = false} = {}) {
    const w = locale(lang);
    const places = locations.map(id => '<li>' + button('awayPlace', '<b>' + escape(placeName(lang, id)) + '</b><small>' + escape(w.placeNotes[id] || '') + '</small>', 'choice', id, busy ? ' disabled' : '') + '</li>').join('');
    return '<section class="campaignScreen postgame" aria-labelledby="postgame-title"><h2 id="postgame-title">' + escape(w.journey) + '</h2>' +
      '<img class="postgameMap" src="assets/campaign/journey-map-unmarked-20261112.jpg" width="1024" height="576" alt="">' +
      status(lang, {points, trips, rankIndex, nextRank}) + '<p>' + escape(busy ? w.hubBusy : w.hubHelp) + '</p>' +
      '<ul class="campaignChoice__list postgamePlaces">' + places + '</ul>' +
      '<div class="campaignActions">' + button('awayClose', escape(w.back), 'secondary') + '</div></section>';
  }
  function goalItems(lang, goals, met, progress) {
    const w = locale(lang);
    return goals.map((goal, i) => {
      const p = progress?.[i];
      const done = met ? met[i] : p && !p.limit && p.met;
      const failed = met ? !met[i] : p && p.limit && !p.met;
      let detail = i === 0 ? w.main : w.extra;
      if (p) {
        const count = p.limit ? w.counts[goal.id] + ' · ' + p.value : p.value + ' / ' + p.target;
        detail = count + ' · ' + (done ? w.achieved : failed ? w.missed : p.limit ? w.holding : w.running);
      } else if (met) detail += ' · ' + (done ? w.achieved : w.missed);
      return '<li class="campaignGoal' + (done ? ' campaignGoal--done' : failed ? ' postgameGoal--missed' : '') + '"><span class="campaignGoal__mark" aria-hidden="true">' + (done ? '✓' : failed ? '✕' : '○') +
        '</span><span class="campaignGoal__copy"><b>' + escape(goalText(lang, goal)) + '</b><small>' + escape(detail) + '</small></span></li>';
    }).join('');
  }
  function brief({lang = 'en', location, level, levels = [], goals = [], team = [], hireLabel = '', locked = [], rule = {}, bonusCap = ''} = {}) {
    const w = locale(lang);
    const choices = levels.map(id => button('awayLevel', escape(w.levels[id] || id), id === level ? 'primary' : 'secondary', id, ' aria-pressed="' + (id === level) + '"')).join('');
    return '<section class="campaignScreen postgame" aria-labelledby="postgame-title"><button type="button" class="postgameBack" data-a="awayReplan">‹ ' + escape(w.changePlace) + '</button><p class="tag">' + escape(w.away) + '</p><h2 id="postgame-title">' + escape(placeName(lang, location)) + '</h2>' +
      '<p>' + escape(w.placeNotes[location] || '') + '</p>' +
      '<h3>' + escape(w.team) + '</h3><p>' + escape(team.length ? team.join(' · ') : w.teamNone) + '</p>' +
      '<div class="postgameLevels">' + button('awayShop',escape(w.shop),'secondary') + (hireLabel ? button('awayTeam',escape(hireLabel),'secondary') : '') + '</div>' +
      '<h3>' + escape(w.level) + '</h3><div class="postgameLevels" role="group" aria-label="' + escape(w.level) + '">' + choices + '</div>' +
      '<h3>' + escape(w.goals) + '</h3><ul class="campaignGoals">' + goalItems(lang, goals, null) + '</ul>' +
      '<div class="campaignActions">' + button('start', escape(w.start)) + button('awayAbortYes', escape(w.toCapital), 'secondary') + '</div>' +
      '<p class="postgameNote">' + escape(fill(w.rewardNote, [w.point(rule.points || 0), Math.round((rule.share || 0) * 100), bonusCap])) + '</p>' +
      '<p class="postgameNote">' + escape(w.kit) + '</p>' +
      (locked.length ? '<p class="postgameNote">' + escape(w.locked + ': ' + locked.join(', ') + '.') + '</p>' : '') +
      '<p class="postgameNote">' + escape(w.income) + '</p></section>';
  }
  function summary({lang = 'en', location, level, goals = [], met = [], served = 0, personal = 0, revenue = '', points = 0, bonus = '', total = 0,
    rankIndex = 0, rankUp = false, saved = true, nextDay, progress} = {}) {
    const w = locale(lang), row = (label, value) => '<span>' + escape(label) + '</span><span class="v">' + escape(value) + '</span>';
    return '<section class="campaignScreen postgame" aria-labelledby="postgame-title"><p class="tag">' + escape(w.away + ' · ' + placeName(lang, location) + ' · ' + (w.levels[level] || '')) + '</p>' +
      '<h2 id="postgame-title">' + escape(w.result) + '</h2><ul class="campaignGoals">' + goalItems(lang, goals, met, progress) + '</ul>' +
      '<div class="rows">' + row(w.served, served) + row(w.personal, personal) + row(w.revenue, revenue) + row(w.earned, '+' + points) + row(w.bonus, '+' + bonus) + row(w.total, total) +
      (saved && nextDay != null ? row(w.nextDay, nextDay) : '') + '</div>' +
      (rankUp ? '<div class="lvup">' + escape(w.newRank + ': ' + rankName(lang, rankIndex)) + '</div>' : '') +
      (saved ? '<div class="campaignActions">' + button('awayReturn', escape(w.returnTrip)) + '</div>' :
        '<p class="postgameNote postgameNote--bad" role="alert">' + escape(w.saveFailed) + '</p><div class="campaignActions">' + button('awayReturn', escape(w.retry)) + button('awayAbortYes', escape(w.leave), 'secondary') + '</div>') +
      '</section>';
  }
  function abort({lang = 'en'} = {}) {
    const w = locale(lang);
    return '<section class="campaignScreen postgame" aria-labelledby="postgame-title"><h2 id="postgame-title">' + escape(w.abortTitle) + '</h2><p>' + escape(w.abortText) + '</p>' +
      '<div class="campaignActions">' + button('awayAbortNo', escape(w.abortNo)) + button('awayAbortYes', escape(w.abortYes), 'secondary') + '</div></section>';
  }
  function progressScreen({lang,location,level,goals,progress}) {
    const w = locale(lang);
    return '<section class="campaignScreen postgame" aria-labelledby="postgame-title"><p class="tag">' + escape(placeName(lang,location) + ' · ' + w.levels[level]) + '</p>' +
      '<h2 id="postgame-title">' + escape(w.tracking) + '</h2><ul class="campaignGoals">' + goalItems(lang,goals,null,progress) + '</ul>' +
      '<div class="campaignActions">' + button('resume',escape(w.resume)) + button('awayAbort',escape(w.abortYes),'secondary') +
      button('menu',escape(w.menu),'secondary') + '</div></section>';
  }
  function management({lang,shop,balance,content}){
    const w=locale(lang);
    return '<section class="campaignScreen postgame"><button type="button" class="postgameBack" data-a="awayManageBack">‹ '+escape(w.toBrief)+'</button>'+
      '<div class="row" style="justify-content:space-between"><h2>'+escape(shop?w.shop:w.manageTeam)+'</h2><b>'+escape(balance)+'</b></div>'+
      '<p>'+escape(shop?w.preparation:w.crewHint)+'</p>'+(shop?'':button('awayShop',escape(w.shop),'secondary'))+
      content+'<div class="campaignActions">'+button('awayManageBack',escape(w.toBrief))+'</div></section>';
  }
  return Object.freeze({ hub, brief, summary, abort, progressScreen, management, goalText, placeName, rankName, words: lang => locale(lang) });
})();
