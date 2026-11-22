/* Kayıt (localStorage, try/catch; erişilemezse bellek). Sürüm alanlı biçim + göç. DOM'a dokunmaz. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var KEY = 'mozaik.save.v1', PKEY = 'mozaik.purchase.v1';
  var mem = {}, persistent = true;
  var store = {
    get: function (k) { try { var v = window.localStorage.getItem(k); return v; } catch (e) { persistent = false; return mem[k] == null ? null : mem[k]; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { persistent = false; mem[k] = v; } },
    remove: function (k) { try { window.localStorage.removeItem(k); } catch (e) { persistent = false; } delete mem[k]; }
  };
  function defaults() {
    var C = MZ.Config;
    return {
      v: C.storeVersion,
      lang: null,
      settings: { theme: 'system', autoX: true, showErrors: true, quickStone: false, patterns: true, sound: true, haptic: true },
      flags: { tutorialDone: false, hintIntroShown: false, removeAdsOfferDay: null },
      progress: { levels: {} },       // id -> {stars, best, done}
      hints: { balance: C.hints.start, lastLoginDay: null, levelTiers: 0 },
      ads: { day: null, rewardedHints: 0, rewardedStreak: 0, gifts: 0, interstitialToday: 0,
             lastInterstitialAt: 0, lastRewardedAt: 0, completions: 0, nextAdAt: C.ads.firstFreeLevels + 1 },
      daily: { done: {}, streak: 0, lastDay: null, shields: 0, broken: null, lastRescueDay: null },
      gallery: [],
      current: null,                  // yarım kalan paket seviyesi
      currentDaily: null              // yarım kalan günlük bulmaca (ayrı yuva)
    };
  }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  // Tür denetimi: varsayılana göre her alanı doğrula, uyuşmazsa varsayılanı kullan
  function coerce(a, d) {
    if (isObj(d)) {
      var out = {}, k;
      if (!isObj(a)) a = {};
      for (k in d) out[k] = coerce(a[k], d[k]);
      for (k in a) if (!(k in d)) out[k] = a[k];     // serbest sözlükler (levels, done) için
      return out;
    }
    if (Array.isArray(d)) return Array.isArray(a) ? a : [];
    if (typeof d === 'number') return (typeof a === 'number' && isFinite(a)) ? a : d;
    if (typeof d === 'boolean') return typeof a === 'boolean' ? a : d;
    if (typeof d === 'string') return typeof a === 'string' ? a : d;
    return a === undefined ? d : a;                   // null varsayılanlar: serbest, ayrıca özel denetim
  }
  function migrate(d) {
    d = coerce(d, defaults());
    var C = MZ.Config, i;
    d.v = C.storeVersion;
    if (d.hints.balance < 0) d.hints.balance = 0;
    if (d.lang !== null && typeof d.lang !== 'string') d.lang = null;
    var st = d.settings; if (['light', 'dark', 'system'].indexOf(st.theme) < 0) st.theme = 'system';
    ['lastLoginDay'].forEach(function (k) { if (d.hints[k] !== null && typeof d.hints[k] !== 'string') d.hints[k] = null; });
    if (d.ads.day !== null && typeof d.ads.day !== 'string') d.ads.day = null;
    // seviye/günlük kayıtları: yalnız geçerli girdiler
    var P = {}; for (i in d.progress.levels) { var r = d.progress.levels[i]; if (isObj(r) && typeof r.stars === 'number' && r.stars >= 0 && r.stars <= 3) P[i] = { stars: r.stars, best: typeof r.best === 'number' ? r.best : null, done: typeof r.done === 'number' ? r.done : 1 }; }
    d.progress.levels = P;
    var dn = {}; for (i in d.daily.done) { var q = d.daily.done[i]; if (isObj(q) && /^\d{4}-\d{2}-\d{2}$/.test(i) && Array.isArray(q.strip)) dn[i] = q; }
    d.daily.done = dn;
    if (d.daily.lastDay !== null && !(typeof d.daily.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.daily.lastDay))) d.daily.lastDay = null;
    if (d.daily.lastRescueDay !== null && typeof d.daily.lastRescueDay !== 'string') d.daily.lastRescueDay = null;
    if (d.daily.broken !== null && !(isObj(d.daily.broken) && typeof d.daily.broken.streak === 'number' && typeof d.daily.broken.missed === 'number' && typeof d.daily.broken.day === 'string')) d.daily.broken = null;
    d.gallery = d.gallery.filter(function (x) { return isObj(x) && typeof x.t === 'string' && typeof x.k === 'string'; });
    ['current', 'currentDaily'].forEach(function (k) { var c = d[k]; if (c !== null && !(isObj(c) && typeof c.key === 'string' && isObj(c.g))) d[k] = null; });
    d.flags.removeAdsOfferDay = typeof d.flags.removeAdsOfferDay === 'string' ? d.flags.removeAdsOfferDay : null;
    return d;
  }
  var data = null;
  var State = MZ.State = {
    store: store,
    isPersistent: function () { return persistent; },
    load: function () {
      var raw = store.get(KEY), d = null;
      if (raw) { try { d = JSON.parse(raw); } catch (e) { d = null; } }
      try { data = isObj(d) ? migrate(d) : defaults(); } catch (e) { data = defaults(); }
      State.data = data;
      return data;
    },
    save: function () { if (data) store.set(KEY, JSON.stringify(data)); },
    reset: function () { store.remove(KEY); data = defaults(); State.data = data; State.save(); return data; },
    // Satın alma kaydı (Play'in sahiplik kaydını taklit eder; ilerleme sıfırlanınca silinmez)
    purchase: function () {
      var raw = store.get(PKEY), p = { adFree: false, bonusGranted: false };
      if (raw) { try { var q = JSON.parse(raw); if (isObj(q)) p = coerce(q, p); } catch (e) {} }
      return p;
    },
    setPurchase: function (p) { store.set(PKEY, JSON.stringify(p)); },
    data: null
  };
})();
