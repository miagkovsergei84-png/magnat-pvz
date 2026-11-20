// Presentation-only components for the story campaign. Inputs are plain data;
// no game state is mutated and all dynamic text is escaped before insertion.
globalThis.PptCampaignUI = (() => {
  const words = {
    ru: {
      map: 'Карта путешествия', mapAltVillage: 'Открытая часть карты: деревня', mapAltTown: 'Открытая часть карты: деревня и городок',
      village: 'Деревня', town: 'Городок', city: 'Мегаполис', capital: 'Столица',
      completed: 'Пройдено', current: 'Текущая глава', locked: 'Закрыто',
      goals: 'Цели главы', goalDone: 'Выполнено', goalPending: 'В процессе',
      continue: 'Продолжить', advance: 'Отправиться в городок', finish: 'Завершить главу',
      cityOutskirts: 'Мегаполис · Окраина', cityCenter: 'Мегаполис · Центр', moveCenter: 'Переехать в центр',
      chooseTitle: 'Кто поедет с вами?', chooseHelp: 'Выберите одного сотрудника для следующей главы.',
      noStaff: 'Пока нет сотрудника для переезда. Пригласите помощника бесплатно, затем выберите его.', rescue: 'Пригласить помощника бесплатно', back: 'Назад', next: 'Далее'
    },
    en: {
      map: 'Journey map', mapAltVillage: 'Discovered map: the village', mapAltTown: 'Discovered map: the village and town',
      village: 'Village', town: 'Town', city: 'City', capital: 'Capital',
      completed: 'Completed', current: 'Current chapter', locked: 'Locked',
      goals: 'Chapter goals', goalDone: 'Completed', goalPending: 'In progress',
      continue: 'Continue', advance: 'Travel to town', finish: 'Complete chapter',
      cityOutskirts: 'City · Outskirts', cityCenter: 'City · Downtown', moveCenter: 'Move downtown',
      chooseTitle: 'Who will come with you?', chooseHelp: 'Choose one employee to join you in the next chapter.',
      noStaff: 'There is no employee available to join you yet. Invite a helper for free, then select them.', rescue: 'Invite a helper for free', back: 'Back', next: 'Next'
    }
  };
  const portraitPaths = Object.freeze({
    anna: 'assets/campaign/anna-portrait.webp',
    maya: 'assets/campaign/maya-portrait.webp',
    leo: 'assets/campaign/leo-portrait.webp',
    narrator: 'assets/campaign/narrator-portrait.webp',
    player: 'assets/characters-webp/uniform-female-a.webp',
    playerCasual: 'assets/campaign/hero-casual.webp',
    playerUniform: 'assets/campaign/hero-uniform.webp',
    eli: 'assets/campaign/eli-portrait.webp',
    nika: 'assets/campaign/nika-portrait-20261111.webp',
    cityBlogger: 'assets/campaign/city-blogger-portrait-20261111.webp'
  });
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function locale(lang) { return lang === 'ru' ? words.ru : words.en; }
  function chapterIndex(chapter) {
    return chapter === 4 || chapter === 'capital' ? 3 : chapter === 3 || chapter === 'city' ? 2 : chapter === 2 || chapter === 'town' || chapter === 'district' ? 1 : 0;
  }
  function action(name, label, kind = 'primary', value) {
    return '<button type="button" class="campaignButton campaignButton--' + kind + '" data-a="' + name + '"' +
      (value === undefined ? '' : ' data-v="' + escape(value) + '"') + '>' + escape(label) + '</button>';
  }
  function map({lang = 'en', chapter = 1, district = null, objectives = [], canAdvance = false, finished = false} = {}) {
    const w = locale(lang), current = chapterIndex(chapter);
    const locations = [w.village, w.town, w.city, w.capital];
    // The whole landscape is visible, but the route names only locations the
    // player has reached. The map artwork deliberately contains no markers.
    const steps = locations.slice(0,current+1).map((label, index) => {
      const state = index < current ? 'done' : 'current';
      const status = state === 'done' ? w.completed : w.current;
      return '<li class="campaignRoute__step campaignRoute__step--' + state + '"' +
        (state === 'current' ? ' aria-current="step"' : '') + '><span class="campaignRoute__number" aria-hidden="true">' +
        (state === 'done' ? '✓' : index + 1) + '</span><span class="campaignRoute__text"><b>' + escape(label) +
        '</b><small>' + escape(status) + '</small></span></li>';
    }).join('');
    const list = Array.isArray(objectives) ? objectives : [];
    const goals = list.map(goal => {
      const item = goal && typeof goal === 'object' ? goal : {};
      return '<li class="campaignGoal' + (item.done ? ' campaignGoal--done' : '') + '"><span class="campaignGoal__mark" aria-hidden="true">' +
        (item.done ? '✓' : '○') + '</span><span class="campaignGoal__copy"><b>' + escape(item.label) + '</b>' +
        (item.progress === undefined || item.progress === null || item.progress === '' ? '' : '<small>' + escape(item.progress) + '</small>') +
        '<span class="campaignSrOnly">' + escape(item.done ? w.goalDone : w.goalPending) + '</span></span></li>';
    }).join('');
    const advance = canAdvance && !finished ? action('campaignAdvance', current === 0 ? w.advance : current === 2 && district === 'outskirts' ? w.moveCenter : w.finish) : '';
    const crop = '0 0 1024 576', alt = w.map;
    const districtLabel=current === 2 && district === 'center' ? w.cityCenter : current === 2 && district === 'outskirts' ? w.cityOutskirts : '';
    return '<section class="campaignScreen" aria-labelledby="campaign-map-title"><h2 id="campaign-map-title">' + escape(w.map) + '</h2>' +
      (districtLabel ? '<p>' + escape(districtLabel) + '</p>' : '') +
      '<div class="campaignMapArt"><svg role="img" aria-label="' + escape(alt) + '" viewBox="' + crop + '" xmlns="http://www.w3.org/2000/svg"><image href="assets/campaign/journey-map-unmarked-20261112.jpg" width="1024" height="576" /></svg></div>' +
      '<ol class="campaignRoute" aria-label="' + escape(w.map) + '">' + steps + '</ol>' +
      '<h3>' + escape(w.goals) + '</h3><ul class="campaignGoals">' + goals + '</ul>' +
      '<div class="campaignActions">' + advance + action('campaignContinue', w.continue, 'secondary') + '</div></section>';
  }
  function choose({lang = 'en', staff = []} = {}) {
    const w = locale(lang), people = Array.isArray(staff) ? staff : [];
    const choices = people.filter(person => person && (typeof person.id === 'string' || Number.isSafeInteger(person.id)))
      .map(person => '<li>' + action('campaignSelect', person.label ?? person.id, 'choice', person.id) + '</li>').join('');
    return '<section class="campaignScreen campaignChoice" aria-labelledby="campaign-choose-title"><h2 id="campaign-choose-title">' +
      escape(w.chooseTitle) + '</h2><p>' + escape(w.chooseHelp) + '</p>' + (choices ? '<ul class="campaignChoice__list">' + choices + '</ul>' :
      '<p class="campaignChoice__empty">' + escape(w.noStaff) + '</p>' + action('campaignRescue', w.rescue, 'choice')) + '<div class="campaignActions">' +
      '<button type="button" class="campaignButton campaignButton--secondary" data-a="campaignContinue" disabled aria-disabled="true">' + escape(w.back) + '</button>' + '</div></section>';
  }
  function dialogue({lang = 'en', speaker = '', text = '', portrait = '', location = 'village', ownedHouse = false, buttonLabel} = {}) {
    const w = locale(lang), path = Object.prototype.hasOwnProperty.call(portraitPaths, portrait) ? portraitPaths[portrait] : '';
    const img = path ? '<img class="campaignDialogue__portrait campaignDialogue__portrait--' + escape(portrait) + '" src="' + path + '" alt="" loading="eager" decoding="async">' : '';
    const villageHouse = location === 'village' && ownedHouse;
    const backdrop = villageHouse ? '<canvas class="campaignDialogue__house" aria-hidden="true"></canvas>' : '';
    return '<section class="campaignScreen campaignDialogue" role="dialog" aria-modal="true" aria-label="' + escape(speaker || w.next) + '">' +
      '<div class="campaignDialogue__scene campaignDialogue__scene--' + (villageHouse ? 'owned' : location === 'capital' ? 'capital' : location === 'city-center' ? 'city-center' : location === 'city' ? 'city' : location === 'town' ? 'town' : 'village') + '">' + backdrop + '<div class="campaignDialogue__tools"><button type="button" data-a="dialogueLanguage" class="campaignDialogue__tool" aria-label="' + (lang === 'ru' ? 'Сменить язык' : 'Change language') + '">' + (lang === 'ru' ? 'EN' : 'RU') + '</button><button type="button" data-a="dialoguePause" class="campaignDialogue__tool" aria-label="' + (lang === 'ru' ? 'Пауза' : 'Pause') + '">Ⅱ</button></div>' + img + '</div><div class="campaignDialogue__box">' +
      (speaker ? '<strong class="campaignDialogue__speaker">' + escape(speaker) + '</strong>' : '') +
      '<p class="campaignDialogue__text" data-dialogue-text="true" aria-label="' + escape(text) + '">' + escape(text) + '</p><div class="campaignDialogue__actions">' + action('campaignSceneNext', buttonLabel || w.next, 'next') + '</div></div></section>';
  }
  // Pure state so pause, language repaint and reload never mutate story data.
  function createTypewriter({charactersPerSecond = 42} = {}) {
    let key = null, chars = [], position = 0;
    const speed = Number.isFinite(charactersPerSecond) && charactersPerSecond > 0 ? charactersPerSecond : 42;
    function begin(nextKey, text, reduced = false) {
      if (key !== nextKey) { key = nextKey; chars = Array.from(String(text ?? '')); position = 0; }
      if (reduced) position = chars.length;
      return snapshot();
    }
    function tick(dt) { if (Number.isFinite(dt) && dt > 0) position = Math.min(chars.length, position + dt * speed); return snapshot(); }
    function reveal() { position = chars.length; return snapshot(); }
    function reset() { key = null; chars = []; position = 0; }
    function snapshot() { return {text: chars.slice(0, Math.floor(position)).join(''), complete: position >= chars.length}; }
    return Object.freeze({begin, tick, reveal, reset, snapshot});
  }
  return Object.freeze({map, choose, dialogue, createTypewriter});
})();
