/* Açılış. */
(function () {
  var MZ = window.MZ, U = MZ.Util, t = function (k, p) { return MZ.I18n.t(k, p); };
  MZ.boot = function () {
    var day = U.param('day');
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) U.setMockDate(day);    // gizli geliştirici seçeneği: tarih taklidi
    MZ.State.load();
    MZ.boot.applyAll();
    var today = U.todayISO(), S = MZ.State.data;
    var add = MZ.Economy.dailyLogin(today);
    MZ.Daily.evaluate(S.daily, today); MZ.State.save();
    MZ.UI.init();
    if (add) setTimeout(function () { MZ.UI.hintToast(t('hint_gift'), add); }, 300);
    if (!S.flags.tutorialDone && MZ.Data.tutorial.length) MZ.UI.startTutorial(0); else MZ.UI.go('menu');
  };
  var lastReal = U.realTodayISO();
  // Gün değişti (gece yarısı): günlük giriş, seri değerlendirme, ekranı yenile (oyun sürerken dokunma)
  MZ.boot.rollover = function () {
    lastReal = U.realTodayISO();
    var today = U.todayISO(), add = MZ.Economy.dailyLogin(today);
    MZ.Daily.evaluate(MZ.State.data.daily, today); MZ.State.save();
    if (add) MZ.UI.hintToast(t('hint_gift'), add);
    if (MZ.UI.current() !== 'game') MZ.UI.render();
  };
  MZ.boot.applyAll = function () {
    var S = MZ.State.data;
    MZ.I18n.set(S.lang || MZ.I18n.detect());
    var st = U.param('style') || S.settings.style || 'a'; MZ.UI.setStyle(st === 'b' ? 'b' : 'a');
    MZ.UI.applyTheme(); MZ.UI.applyLang();
  };
  MZ.UI.init = function () {
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var f = function () { if (MZ.State.data.settings.theme === 'system') MZ.UI.applyTheme(); };
      if (mq.addEventListener) mq.addEventListener('change', f);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden && MZ.UI.G && MZ.UI.G.game) MZ.UI.leaveGame && MZ.UI.current() === 'game' && MZ.UI.G.game && !MZ.UI.G.game.won && saveSoon(); });
    function saveSoon() { MZ.UI.saveCurrent(); }
    setInterval(function () { if (!U.mockDate() && U.realTodayISO() !== lastReal) MZ.boot.rollover(); }, 2000);
    window.addEventListener('pagehide', function () { if (MZ.UI.current() === 'game') saveSoon(); });
  };
  function start() { MZ.boot(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
