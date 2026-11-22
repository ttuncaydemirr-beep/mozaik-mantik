/* Çeviri: yalnız sözlükten. Eksik anahtar -> en -> tr -> anahtar adı. Rakamlar Batı rakamı (String(n)). */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var dicts = (window.MZ_DATA && window.MZ_DATA.i18n) || {};
  var lang = 'en', missing = {}, fb = {};
  function supported(c) { return MZ.Config.languages.indexOf(c) >= 0; }
  function detect() {
    var list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || ['en'];
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i] || '').slice(0, 2).toLowerCase();
      if (c === 'in') c = 'id';
      if (supported(c)) return c;
    }
    return 'en';
  }
  function t(key, params) {
    var s = dicts[lang] && dicts[lang][key];
    if (s == null) fb[lang + ':' + key] = 1;      // etkin dilde yok: yedeğe düşüldü (test bunu hata sayar)
    if (s == null) s = dicts.en && dicts.en[key];
    if (s == null) s = dicts.tr && dicts.tr[key];
    if (s == null) { missing[key] = 1; s = key; }
    if (params) for (var k in params) s = s.split('{' + k + '}').join(String(params[k]));
    return s;
  }
  MZ.I18n = {
    t: t, detect: detect, supported: supported,
    set: function (l) { lang = supported(l) ? l : 'en'; },
    get: function () { return lang; },
    isRTL: function () { return MZ.Config.rtlLanguages.indexOf(lang) >= 0; },
    dir: function () { return MZ.Config.rtlLanguages.indexOf(lang) >= 0 ? 'rtl' : 'ltr'; },
    missing: function () { return Object.keys(missing); },
    fallbacks: function () { return Object.keys(fb); },
    hasKey: function (k) { return !!(dicts.tr && dicts.tr[k] != null); }
  };
})();
