/* İlerleme iş kuralları (DOM'suz; Flutter'a birebir taşınır): seviye kaydı, yıldız, paket kilidi,
   seviye/günlük tamamlama ödülleri, galeri. Arayüz yalnız çağırır. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  function S() { return MZ.State.data; }
  function C() { return MZ.Config; }
  function hasGallery(t, k) { return S().gallery.some(function (x) { return x.t === t && x.k === k; }); }
  var Progress = MZ.Progress = {
    packStats: function (pack) {
      var list = MZ.Data.packs[pack], P = S().progress.levels, done = 0, s2 = 0, stars = 0;
      list.forEach(function (l) { var r = P[l.id]; if (r && r.stars >= 1) { done++; stars += r.stars; if (r.stars >= C().unlock.star2Min) s2++; } });
      return { total: list.length, done: done, s2: s2, stars: stars };
    },
    // Paket kilidi (Bölüm 7.1): önceki pakette >= 30 tamam ya da >= 20 adet ★★+ (paket boyutuyla sınırlı)
    packLock: function (pi, forceUnlock) {
      if (forceUnlock || pi === 0) return { locked: false, remaining: 0 };
      var st = Progress.packStats(C().packs[pi - 1]), U = C().unlock;
      var needC = Math.min(U.completed, st.total), needS = Math.min(U.star2Count, st.total);
      if (st.done >= needC || st.s2 >= needS) return { locked: false, remaining: 0 };
      return { locked: true, remaining: Math.max(1, Math.min(needC - st.done, needS - st.s2)) };
    },
    recordLevel: function (lv, stars, time) {
      var P = S().progress.levels, r = P[lv.id] || { stars: 0, best: null, done: 0 };
      var piece = stars > r.stars, first = r.done === 0;
      r.stars = Math.max(r.stars, stars); r.best = r.best == null ? time : Math.min(r.best, time); r.done++;
      P[lv.id] = r;
      Progress.checkGallery();
      return { piece: piece, first: first, best: r.best };
    },
    // Paket seviyesi tamamlandı: yıldız + kayıt + sayaçlar + ipucu ödülü. Dönüş arayüze gösterim bilgisi verir.
    completeLevel: function (lv, game) {
      var stars = MZ.Logic.stars(game.hints, game.errors);
      var rec = Progress.recordLevel(lv, stars, game.elapsed);
      MZ.Economy.onLevelCompleted();
      var bonus = MZ.Economy.onUniqueLevels(MZ.Economy.uniqueCompleted());
      MZ.State.data.current = null; MZ.State.save();
      return { mode: 'level', time: game.elapsed, hints: game.hints, errors: game.errors, stars: stars, newPiece: rec.piece, best: rec.best, hintBonus: bonus };
    },
    completeDaily: function (date, game) {
      var stars = MZ.Logic.stars(game.hints, game.errors);
      var res = MZ.Daily.complete(S().daily, date, { time: game.elapsed, hints: game.hints, errors: game.errors, stars: stars, strip: game.strip(), at: Date.now() });
      var bonus = res.first ? MZ.Economy.onDailyPuzzleDone() : 0;
      Progress.checkGallery();
      S().currentDaily = null; MZ.State.save();
      return { mode: 'daily', time: game.elapsed, hints: game.hints, errors: game.errors, stars: stars, first: res.first, record: res.record, shield: res.shield, hintBonus: bonus };
    },
    // Biten paket panosu ve biten ay panosu galeriye girer
    checkGallery: function () {
      var P = S().progress.levels, g = S().gallery, added = false;
      C().packs.forEach(function (pk) {
        var list = MZ.Data.packs[pk];
        if (list.length && list.every(function (l) { return P[l.id] && P[l.id].stars >= 1; }) && !hasGallery('pack', pk)) { g.push({ t: 'pack', k: pk }); added = true; }
      });
      var months = {}, done = S().daily.done;
      Object.keys(done).forEach(function (d) { months[d.slice(0, 7)] = 1; });
      Object.keys(months).forEach(function (m) {
        var y = +m.slice(0, 4), mo = +m.slice(5, 7), n = MZ.Util.daysInMonth(y, mo), all = true;
        for (var i = 1; i <= n; i++) if (!done[m + '-' + MZ.Util.pad2(i)]) { all = false; break; }
        if (all && !hasGallery('month', m)) { g.push({ t: 'month', k: m }); added = true; }
      });
      if (added) MZ.State.save();
      return added;
    }
  };
})();
