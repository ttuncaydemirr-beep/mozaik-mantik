/* Tek yapılandırma nesnesi. Flutter'da Firebase Remote Config karşılığı olacak.
   Test/geliştirme: window.__MZ_CONFIG_OVERRIDE ile derin birleştirilir. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var base = {
    storeVersion: 1,
    developer: 'Demir Games Studio',
    supportEmail: 'nilkaren.tuncay.demir@gmail.com',
    privacyUrl: 'https://ttuncaydemirr-beep.github.io/privacy/mozaik-mantik/',
    siteUrl: 'https://ttuncaydemirr-beep.github.io/',
    languages: ['tr', 'ar', 'en', 'de', 'es', 'pt', 'ru', 'id'],
    languageNames: { tr: 'Türkçe', ar: 'العربية', en: 'English', de: 'Deutsch', es: 'Español', pt: 'Português', ru: 'Русский', id: 'Bahasa Indonesia' },
    rtlLanguages: ['ar'],
    packs: ['cirak', 'kalfa', 'usta', 'basusta', 'nakkas'],
    unlock: { completed: 30, star2Count: 20, star2Min: 2 },      // Bölüm 7.1
    hints: {                                                      // Bölüm 4.3
      start: 5, cap: 12, freeCap: 5, dailyLogin: 1, dailyLoginAdFree: 2,
      dailyPuzzle: 1, everyLevels: 10, everyLevelsAmount: 1,
      rewardedAmount: 2, removeAdsBonus: 10, giftAmount: 1, giftPerDay: 1
    },
    ads: {                                                        // Bölüm 8
      interstitialEnabled: true,
      firstFreeLevels: 6,        // ilk 6 gerçek seviyede reklam yok
      everyLevels: 4,            // 7., 11., 15. ...
      minGapSec: 120,            // iki geçiş reklamı arası
      dailyCap: null,            // günlük geçiş üst sınırı YOK (Tuncay onayı)
      rewardedResetsCounterSec: 300,
      rewardedHintsPerDay: 10,
      rewardedStreakPerDay: 1,
      streakRescueWeeklyMax: 1,
      resultCardMinMs: 2000,
      requireOnline: true,
      fakeAdMs: 2500,            // sahte reklam süresi (2-3 sn)
      fakeFailRate: 0,           // 0..1, sahte yükleme hatası (test: ?adfail=1)
      bannerEnabled: false       // paket seçim ekranı altı (varsayılan kapalı; ?banner=1)
    },
    game: { longPressMs: 350, minCellPx: 30, maxCellPx: 72, winAnimMs: 1400, hintIntroOnce: true },
    daily: {
      epoch: '2026-11-22',       // gün #1 (yayında sabitlenecek)
      weekdayPack: { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 0: 5 },   // Pzt..Paz (0=Paz)
      selectMode: 'weekday',     // 'weekday' (zorluk eğrisi) | 'poolIndex' (havuz[(gün-1) mod boyut])
      shieldEvery: 7, shieldMax: 2
    }
  };
  function merge(a, b) {
    if (!b) return a;
    for (var k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  MZ.Config = merge(base, window.__MZ_CONFIG_OVERRIDE);
  MZ.merge = merge;
})();
