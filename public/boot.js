// Messenger — предзагрузка визуала.
// Обычный (не module) скрипт, стоящий сразу после <body>: он выполняется до
// первой отрисовки и выставляет тему со стилем. Без него браузер успевал
// нарисовать дефолтную Matrix и только потом переключиться — это и было
// «мерцание темы».
(function () {
  var THEMES = ['matrix', 'fuxxtylle', 'mind-ctrl', 't-800', 'darkness', 'corporate', 'angel', 'max', 'tg', 'vaporwave', 'golden'];
  var STYLES = ['flat', 'brutal', 'skeuo', 'julesverne'];
  var read = function (key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  };
  var body = document.body;
  try {
    var theme = read('theme', THEMES[0]);
    var style = read('style', STYLES[0]);
    if (THEMES.indexOf(theme) < 0) theme = THEMES[0]; // тема могла остаться от старой версии
    if (STYLES.indexOf(style) < 0) style = STYLES[0];
    body.dataset.theme = theme;
    body.dataset.style = style;
    var lang = read('lang', null) || (String(navigator.language || '').toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en');
    document.documentElement.lang = lang;
    document.title = lang === 'ru' ? 'Мессенджер' : 'Messenger';
  } catch (e) {
    body.dataset.theme = THEMES[0];
    body.dataset.style = STYLES[0];
  }
})();
