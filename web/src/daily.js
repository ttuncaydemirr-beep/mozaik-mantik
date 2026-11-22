/* Günlük bulmaca: gün numarası, seçim, seri, seri koruma/kurtarma (Bölüm 5). DOM'suz. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var U = function () { return MZ.Util; };
  var PACK_IDX = { cirak: 1, kalfa: 2, usta: 3, basusta: 4, nakkas: 5 };
  var Daily = MZ.Daily = {
    packIndex: function (p) { return PACK_IDX[p] || 0; },
    dayNumber: function (iso) { return Math.max(1, U().dayIndex(iso) - U().dayIndex(MZ.Config.daily.epoch) + 1); },
    targetDiff: function (iso) { return MZ.Config.daily.weekdayPack[U().weekday(iso)]; },
    // Seçim: bulmacalar `dow` (mon..sun) alanına göre 7 kuyruğa bölünür; GERÇEK haftanın gününe uyan kuyruktan
    // kuyruk[dow][floor((gün#-1)/7) mod uzunluk] alınır. dow yoksa: zorluğa göre süz, o da yoksa havuz[(gün-1) mod boyut].
    DOW: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    pick: function (pool, iso) {
      if (!pool || !pool.length) return null;
      var day = Daily.dayNumber(iso), wk = Math.floor((day - 1) / 7), mode = MZ.Config.daily.selectMode;
      if (mode !== 'poolIndex') {
        var dow = Daily.DOW[U().weekday(iso)], q = pool.filter(function (p) { return p.dow === dow; });
        if (!q.length) { var want = Daily.targetDiff(iso); q = pool.filter(function (p) { return Daily.packIndex(p.pack) === want; }); }
        if (q.length) return q[wk % q.length];
      }
      return pool[(day - 1) % pool.length];
    },
    // Bugüne göre seriyi değerlendir (kaçırılan gün: koruma harca ya da seriyi boz)
    evaluate: function (d, today) {
      var ev = { protectedDays: 0, broken: false };
      if (!d.lastDay) return ev;
      var gap = U().dayIndex(today) - U().dayIndex(d.lastDay);
      if (gap <= 1) return ev;
      var missed = gap - 1;
      if (d.shields >= missed) {
        d.shields -= missed; d.lastDay = U().addDays(today, -1); ev.protectedDays = missed;
      } else {
        d.broken = { streak: d.streak, missed: missed, day: today };
        d.streak = 0; d.lastDay = null; ev.broken = true;
      }
      return ev;
    },
    canRescue: function (d, today) {
      var b = d.broken;
      if (!b || b.day !== today || b.missed !== 1 || d.done[today]) return false;
      if (d.lastRescueDay && U().dayIndex(today) - U().dayIndex(d.lastRescueDay) < 7 * MZ.Config.ads.streakRescueWeeklyMax) return false;
      return true;
    },
    rescue: function (d, today) {
      if (!Daily.canRescue(d, today)) return false;
      d.streak = d.broken.streak; d.lastDay = U().addDays(today, -1); d.broken = null; d.lastRescueDay = today; return true;
    },
    isDone: function (d, today) { return !!d.done[today]; },
    // İlk tamamlama kaydı; tekrar oynamada seri ve paylaşım ilk sonuçtan alınır
    complete: function (d, today, result) {
      if (d.done[today]) return { first: false, record: d.done[today] };
      Daily.evaluate(d, today);
      d.streak = d.streak + 1; d.lastDay = today; d.broken = null;
      var shield = false;
      if (d.streak % MZ.Config.daily.shieldEvery === 0 && d.shields < MZ.Config.daily.shieldMax) { d.shields++; shield = true; }
      result.streak = d.streak; result.dayNo = Daily.dayNumber(today);
      d.done[today] = result;
      return { first: true, record: result, shield: shield };
    },
    // Ay panosu: o ayın açık günleri
    monthInfo: function (today) {
      var p = U().parseISO(today), n = U().daysInMonth(p.y, p.m), out = [];
      for (var i = 1; i <= n; i++) out.push(p.y + '-' + U().pad2(p.m) + '-' + U().pad2(i));
      return { y: p.y, m: p.m, days: out };
    }
  };
})();
