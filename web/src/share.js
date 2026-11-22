/* Paylaşım metni (Bölüm 5.3): yalnız emoji, rakam, oyun adı; çözümün konumunu vermez. DOM'suz. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var LRM = '‎', SQ = { c: '🟦', h: '🟨', x: '🟥' };   // 🟦 🟨 🟥
  MZ.Share = {
    // strip: konulma sırasıyla 'c' temiz, 'h' ipucuyla, 'x' çakışma yaratıp düzeltilmiş
    build: function (o) {
      var stars = '', i;
      for (i = 0; i < 3; i++) stars += i < o.stars ? '★' : '☆';
      var lines = [
        'Mozaik Mantık #' + o.dayNo,
        '⏱ ' + MZ.Util.fmtTime(o.time) + '   💡 ' + o.hints + '   ✖ ' + o.errors + '   ' + stars + '   🔥 ' + o.streak,
        o.strip.map(function (k) { return SQ[k] || SQ.c; }).join(''),
        MZ.Config.siteUrl
      ];
      if (o.rtl) lines = lines.map(function (l) { return LRM + l; });
      return lines.join('\n');
    },
    canNativeShare: function () { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; },
    nativeShare: function (text) { return navigator.share({ text: text }); },
    copy: function (text) {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      return Promise.reject(new Error('no-clipboard'));
    }
  };
})();
