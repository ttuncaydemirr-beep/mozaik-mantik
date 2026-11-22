/* Veri katmanı: window.MZ_DATA'dan paketleri/seviyeleri çıkarır (DOM'suz). Biçim farklılıklarına toleranslı. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  function list(x, keys) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    for (var i = 0; i < keys.length; i++) if (Array.isArray(x[keys[i]])) return x[keys[i]];
    return [];
  }
  var D = window.MZ_DATA || {};
  var levels = list(D.levels, ['levels']), daily = list(D.daily, ['puzzles', 'levels']), tut = list(D.tutorial, ['levels', 'puzzles', 'tutorial']);
  var byId = {}, packs = {};
  MZ.Config.packs.forEach(function (p) { packs[p] = []; });
  levels.forEach(function (l) { byId[l.id] = l; if (packs[l.pack]) packs[l.pack].push(l); });
  MZ.Solver = window.MozaikSolver;
  MZ.Data = {
    levels: levels, daily: daily, tutorial: tut, packs: packs,
    level: function (id) { return byId[id] || null; },
    packIndex: function (p) { return MZ.Config.packs.indexOf(p) + 1; },
    packSizes: function (p) { var a = packs[p].map(function (l) { return l.n; }); return a.length ? [Math.min.apply(null, a), Math.max.apply(null, a)] : [0, 0]; },
    nextInPack: function (l) { var a = packs[l.pack], i = a.indexOf(l); return i >= 0 && i + 1 < a.length ? a[i + 1] : null; },
    meta: D.meta || {}
  };
})();
