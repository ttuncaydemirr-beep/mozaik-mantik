/* İpucu ekonomisi ve reklam sayaçları (Bölüm 4.3, 4.4, 8). DOM'suz; tüm rakamlar MZ.Config'ten. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  function D() { return MZ.State.data; }
  function C() { return MZ.Config; }
  var E = MZ.Economy = {
    adFree: function () { return !!MZ.State.purchase().adFree; },
    balance: function () { return D().hints.balance; },
    canAfford: function (n) { return D().hints.balance >= n; },
    spend: function (n) { if (D().hints.balance < n) return false; D().hints.balance -= n; MZ.State.save(); return true; },
    // Ücretsiz kaynaklar genel tavanı (12) aşamaz. Dönen: gerçekten eklenen miktar.
    grant: function (n) {
      var cap = C().hints.cap, b = D().hints.balance, add = Math.max(0, Math.min(n, cap - b));
      D().hints.balance = b + add; MZ.State.save(); return add;
    },
    // Günün başında sayaçları sıfırla
    rollDay: function (today) {
      var a = D().ads;
      if (a.day !== today) { a.day = today; a.rewardedHints = 0; a.rewardedStreak = 0; a.gifts = 0; a.interstitialToday = 0; MZ.State.save(); }
    },
    // Günlük ilk giriş: bakiye 5'in altındaysa tamamlanır (ücretsiz tavan 5)
    dailyLogin: function (today) {
      var h = D().hints, add = 0;
      E.rollDay(today);
      if (h.lastLoginDay === today) return 0;
      h.lastLoginDay = today;
      var amt = E.adFree() ? C().hints.dailyLoginAdFree : C().hints.dailyLogin;
      if (h.balance < C().hints.freeCap) { add = Math.min(amt, C().hints.freeCap - h.balance); h.balance += add; }
      MZ.State.save(); return add;
    },
    onDailyPuzzleDone: function () { return E.grant(C().hints.dailyPuzzle); },
    // Her 10 farklı seviye tamamlamada +1
    onUniqueLevels: function (uniqueCount) {
      var tiers = Math.floor(uniqueCount / C().hints.everyLevels), h = D().hints, add = 0;
      if (tiers > h.levelTiers) { add = E.grant((tiers - h.levelTiers) * C().hints.everyLevelsAmount); h.levelTiers = tiers; MZ.State.save(); }
      return add;
    },
    // --- Ödüllü reklam
    rewardedHintsLeft: function (today) { E.rollDay(today); return Math.max(0, C().ads.rewardedHintsPerDay - D().ads.rewardedHints); },
    canWatchRewardedHint: function (today) { return E.rewardedHintsLeft(today) > 0; },
    grantRewardedHints: function (now) {
      var a = D().ads; a.rewardedHints++; a.lastRewardedAt = now;
      var add = E.grant(C().hints.rewardedAmount); MZ.State.save(); return add;
    },
    canWatchRewardedStreak: function (today) { E.rollDay(today); return D().ads.rewardedStreak < C().ads.rewardedStreakPerDay; },
    markRewardedStreak: function (now) { D().ads.rewardedStreak++; D().ads.lastRewardedAt = now; MZ.State.save(); },
    giftAvailable: function (today) { E.rollDay(today); return D().ads.gifts < C().hints.giftPerDay; },
    grantGift: function () { D().ads.gifts++; return E.grant(C().hints.giftAmount); },
    // --- Geçiş reklamı (Bölüm 8.1)
    // Aralık sayacı her tamamlamada (tekrar dahil) ilerler; "ilk 6 seviye" eşiği yalnız benzersiz tamamlananlarla sayılır
    onLevelCompleted: function () { D().ads.completions++; MZ.State.save(); return D().ads.completions; },
    uniqueCompleted: function () { var P = D().progress.levels, n = 0; for (var k in P) if (P[k] && P[k].stars >= 1) n++; return n; },
    // "Sonraki"ye basıldığında çağrılır. {show, reason}
    interstitialDecision: function (now, online, today) {
      var A = C().ads, a = D().ads, k = a.completions;
      E.rollDay(today);
      if (!A.interstitialEnabled) return { show: false, reason: 'disabled' };
      if (E.adFree()) return { show: false, reason: 'adfree' };
      if (E.uniqueCompleted() <= A.firstFreeLevels) return { show: false, reason: 'first-levels' };
      if (k < a.nextAdAt) return { show: false, reason: 'interval' };
      if (A.requireOnline && online === false) return { show: false, reason: 'offline' };
      if (A.dailyCap != null && a.interstitialToday >= A.dailyCap) return { show: false, reason: 'daily-cap' };
      if (a.lastRewardedAt && now - a.lastRewardedAt < A.rewardedResetsCounterSec * 1000) {
        a.nextAdAt = k + A.everyLevels; MZ.State.save();       // iki reklam üst üste yok: sayaç sıfırlanır
        return { show: false, reason: 'rewarded-recent' };
      }
      if (a.lastInterstitialAt && now - a.lastInterstitialAt < A.minGapSec * 1000) return { show: false, reason: 'min-gap' };  // sayaç bekler
      return { show: true, reason: 'ok' };
    },
    markInterstitialShown: function (now) {
      var a = D().ads; a.lastInterstitialAt = now; a.interstitialToday++; a.nextAdAt = a.completions + C().ads.everyLevels; MZ.State.save();
    },
    // Ödüllü reklam sonucu (başarı ya da yükleme hatası). Dönüş: {kind: hint|streak|gift|unavailable, add}
    finishRewarded: function (purpose, ok, now, today) {
      if (ok) {
        if (purpose === 'hint') return { kind: 'hint', add: E.grantRewardedHints(now) };
        E.markRewardedStreak(now); var okr = MZ.Daily.rescue(D().daily, today); MZ.State.save();
        return { kind: 'streak', add: 0, rescued: okr };
      }
      if (purpose === 'hint' && E.giftAvailable(today)) return { kind: 'gift', add: E.grantGift() };
      return { kind: 'unavailable', add: 0 };
    },
    canWatch: function (purpose, today) { return purpose === 'hint' ? E.canWatchRewardedHint(today) : E.canWatchRewardedStreak(today); },
    // --- Reklamları kaldır (SAHTE satın alma)
    removeAds: function (today) {
      var p = MZ.State.purchase(), bonus = 0;
      p.adFree = true;
      if (!p.bonusGranted) { p.bonusGranted = true; D().hints.balance += C().hints.removeAdsBonus; bonus = C().hints.removeAdsBonus; }   // tavana bakılmaksızın, tek sefer
      MZ.State.setPurchase(p); MZ.State.save(); return bonus;
    },
    restore: function () { return MZ.State.purchase().adFree; }
  };
})();
