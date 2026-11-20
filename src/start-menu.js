// HTML only: the caller owns language, state, saving and button handling.
globalThis.PptStartMenu = (() => {
  const copy = {
    ru: {
      label: 'Главное меню', titleFirst: 'МАГНАТ', titleSecond: 'ПВЗ',
      slogan: 'Принимай. Выдавай. Развивай!', sign: 'Пункт выдачи',
      continue: 'Продолжить', newGame: 'Новая игра', settings: 'Настройки', languages: 'Язык'
    },
    en: {
      label: 'Main menu', titleFirst: 'PICKUP POINT', titleSecond: 'TYCOON',
      slogan: 'Receive. Hand Out. Grow!', sign: 'Pickup point',
      continue: 'Continue', newGame: 'New game', settings: 'Settings', languages: 'Language'
    }
  };
  function render({ lang = 'ru', hasSave = false } = {}) {
    const language = lang === 'en' ? 'en' : 'ru';
    const t = copy[language];
    const action = (name, text, primary) =>
      '<button type="button" class="startMenu__button ' + (primary ? 'startMenu__button--primary' : 'startMenu__button--secondary') +
      '" data-a="' + name + '">' + text + '</button>';
    return '<section class="startMenu" lang="' + language + '" aria-label="' + t.label + '">' +
      '<header class="startMenu__brand"><h1><span>' + t.titleFirst + '</span><strong>' + t.titleSecond + '</strong></h1>' +
      '<p class="startMenu__slogan">' + t.slogan + '</p></header>' +
      '<div class="startMenu__art" aria-hidden="true"><div class="startMenu__sign"><div class="startMenu__signRow"><span class="startMenu__signText">' + t.sign + '</span><svg class="startMenu__signCube" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5 56 18 32 31 8 18 32 5Zm-24 13v28l24 13V31m24-13v28L32 59" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg></div></div></div>' +
      '<div class="startMenu__scene" aria-hidden="true"></div>' +
      '<div class="startMenu__controls"><div class="startMenu__actions">' +
      (hasSave ? action('cont', t.continue, true) : '') + action('new', t.newGame, !hasSave) +
      '</div><div class="startMenu__footer"><button type="button" class="startMenu__settings" data-a="menuSettings">' +
      '<span aria-hidden="true">⚙</span> ' + t.settings + '</button>' +
      '<nav class="startMenu__languages" aria-label="' + t.languages + '">' +
      '<button type="button" data-a="lang" data-v="ru" lang="ru" aria-pressed="' + (language === 'ru') + '">РУС</button>' +
      '<button type="button" data-a="lang" data-v="en" lang="en" aria-pressed="' + (language === 'en') + '">ENG</button>' +
      '</nav></div></div></section>';
  }
  return Object.freeze({ render });
})();
