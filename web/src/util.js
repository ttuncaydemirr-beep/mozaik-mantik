/* Küçük yardımcılar (DOM'suz). Tarih işlemleri UTC bileşenleriyle yapılır (yaz saati sorunu yok). */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var mockDate = null;
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function parseISO(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function dayIndex(iso) { var p = parseISO(iso); return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86400000); }
  function fromIndex(i) { var d = new Date(i * 86400000); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  MZ.Util = {
    pad2: pad2, parseISO: parseISO, dayIndex: dayIndex, fromIndex: fromIndex,
    addDays: function (iso, k) { return fromIndex(dayIndex(iso) + k); },
    weekday: function (iso) { return new Date(dayIndex(iso) * 86400000).getUTCDay(); },   // 0=Pazar
    daysInMonth: function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); },
    setMockDate: function (iso) { mockDate = iso || null; },
    mockDate: function () { return mockDate; },
    todayISO: function () {
      if (mockDate) return mockDate;
      var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    },
    realTodayISO: function () { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); },
    msToMidnight: function () { var n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return m - n; },
    fmtTime: function (ms) { var s = Math.max(0, Math.floor(ms / 1000)); return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); },
    fmtClock: function (ms) { var s = Math.max(0, Math.floor(ms / 1000)); return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60); },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    param: function (k) { try { if (k === 'style' && /^#style-b$/.test(location.hash)) return 'b'; return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  };
})();
