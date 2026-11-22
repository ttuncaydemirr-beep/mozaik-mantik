/* Arayüz çekirdeği: DOM yardımcıları, ikonlar, tost, katmanlar, tema, ses/titreşim, sahte reklam. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var UI = MZ.UI = { paused: 0 };
  var t = function (k, p) { return MZ.I18n.t(k, p); };

  UI.h = function (tag, attrs, kids) {
    var el = document.createElement(tag), k;
    attrs = attrs || {};
    for (k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'on') for (var ev in v) el.addEventListener(ev, v[ev]);
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c == null || c === false) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  };
  var h = UI.h;

  var P = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"/>',
    sliders: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    tiles: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    share: '<path d="M4 12v7h16v-7M12 15V3M8 7l4-4 4 4"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 8v5M8 10.5h5"/>',
    adplay: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>'
  };
  UI.icon = function (name, cls, fill) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico ' + (cls || '')); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('fill', fill ? 'currentColor' : 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = P[name] || '';
    return s;
  };
  UI.iconHTML = function (name, cls, fill) { var d = document.createElement('div'); d.appendChild(UI.icon(name, cls, fill)); return d.innerHTML; };

  // --- Ses / titreşim
  var ac = null;
  UI.beep = function (f, d) {
    if (!MZ.State.data.settings.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; g.gain.value = 0.05; o.connect(g); g.connect(ac.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.stop(ac.currentTime + d);
    } catch (e) {}
  };
  UI.buzz = function (ms) {
    if (!MZ.State.data.settings.haptic) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  };

  // --- Tema
  var mq = null;
  UI.applyTheme = function () {
    var th = MZ.State.data.settings.theme, dark;
    if (th === 'system') { mq = mq || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')); dark = !!(mq && mq.matches); }
    else dark = th === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  };
  UI.applyLang = function () {
    var de = document.documentElement;
    de.setAttribute('lang', MZ.I18n.get()); de.setAttribute('dir', MZ.I18n.dir());
    document.title = t('app_name');
    de.classList.toggle('patterns', !!MZ.State.data.settings.patterns);
  };

  // --- Tost
  UI.toast = function (content, ms) {
    var box = document.getElementById('toasts');
    var el = h('div', { class: 'toast', role: 'status' }, [typeof content === 'string' ? document.createTextNode(content) : content]);
    box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, ms || 2200);
  };
  UI.hintToast = function (txt, n) {
    var el = h('span', { class: 'toast-row' }, [UI.icon('bulb'), document.createTextNode(' ' + (n != null ? '+' + n + ' ' : '') + (txt || ''))]);
    UI.toast(el);
  };

  // --- Katmanlar (modal)
  UI.overlay = function (node, cls) {
    var root = document.getElementById('overlay');
    var wrap = h('div', { class: 'ov ' + (cls || '') }, [node]);
    root.appendChild(wrap);
    UI.paused++;
    var closed = false;
    return { el: wrap, close: function () { if (closed) return; closed = true; wrap.remove(); UI.paused = Math.max(0, UI.paused - 1); } };
  };
  UI.confirm = function (text, onYes) {
    var ov;
    var card = h('div', { class: 'card dialog', role: 'dialog', 'aria-modal': 'true' }, [
      h('p', { class: 'dlg-text', text: text }),
      h('div', { class: 'row-btns' }, [
        h('button', { class: 'btn', text: t('btn_cancel'), on: { click: function () { ov.close(); } } }),
        h('button', { class: 'btn primary danger', 'data-id': 'confirm-yes', text: t('btn_ok'), on: { click: function () { ov.close(); onYes(); } } })
      ])
    ]);
    ov = UI.overlay(card, 'center');
  };

  // --- SAHTE reklam kartı. Gerçek reklam yok; kurallar economy.js'te. console.log ile izlenir.
  UI.fakeAd = function (kind) {
    return new Promise(function (resolve) {
      var A = MZ.Config.ads, ms = A.fakeAdMs, bar = h('div', { class: 'ad-bar-in' });
      var fail = MZ.Util.param('adfail') === '1' || Math.random() < A.fakeFailRate;
      var title = h('p', { class: 'ad-title', text: t(kind === 'rewarded' ? 'ad_reward_preview' : 'ad_preview') });
      var card = h('div', { class: 'ad-card', role: 'dialog', 'aria-modal': 'true', 'data-ad': kind }, [
        title, h('div', { class: 'ad-art', 'aria-hidden': 'true' }), h('div', { class: 'ad-bar' }, [bar])
      ]);
      var ov = UI.overlay(card, 'ad-ov');
      console.log('[MZ-AD] ' + kind + ' reklam GÖSTERİLİYOR (sahte), süre=' + ms + 'ms' + (fail ? ' [yükleme hatası simülasyonu]' : ''));
      requestAnimationFrame(function () { bar.style.transitionDuration = ms + 'ms'; bar.style.width = '100%'; });
      setTimeout(function () {
        ov.close();
        console.log('[MZ-AD] ' + kind + ' reklam ' + (fail ? 'BAŞARISIZ (ödül yok)' : 'TAMAMLANDI'));
        resolve(!fail);
      }, fail ? Math.min(ms, 600) : ms);
    });
  };
  MZ.adLog = [];
})();
