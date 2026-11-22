/* Ekranlar: menü, paketler, pano, günlük, Çini Atölyesi, ayarlar + gezinme. */
(function () {
  var MZ = window.MZ, UI = MZ.UI, h = UI.h, U = MZ.Util, C = MZ.Config;
  var t = function (k, p) { return MZ.I18n.t(k, p); };
  UI.screens = {}; UI.cleanups = {};
  function S() { return MZ.State.data; }
  var cur = { name: null, params: null }, tickTimer = null;

  UI.go = function (name, params) {
    if (cur.name && UI.cleanups[cur.name]) UI.cleanups[cur.name]();
    if (cur.name === 'game' && name !== 'game') UI.leaveGame();
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    cur = { name: name, params: params || {} };
    var root = document.getElementById('screen'); root.innerHTML = '';
    root.setAttribute('data-screen', name);
    UI.screens[name](root, cur.params);
    root.scrollTop = 0;
  };
  UI.render = function () { var p = cur.params; if (cur.name === 'game') { UI.refreshGameControls(); } UI.go(cur.name || 'menu', p); };
  UI.current = function () { return cur.name; };
  UI.back = function () {
    var n = cur.name;
    if (n === 'game') { var sp = UI.G.spec; if (sp.mode === 'daily') UI.go('daily'); else UI.go('packBoard', { pack: sp.level.pack }); }
    else if (n === 'packBoard') UI.go('packs'); else UI.go('menu');
  };

  function topbar(title, opt) {
    opt = opt || {};
    return h('header', { class: 'topbar' }, [
      h('button', { class: 'icon-btn flip', 'aria-label': t('btn_back'), 'data-id': 'back', on: { click: function () { UI.back(); } } }, [UI.icon('back')]),
      h('h1', { class: 'bar-title', text: title }),
      opt.right || h('span', { class: 'bar-spacer' })
    ]);
  }
  function streakChip() {
    return h('div', { class: 'chip', 'data-id': 'streak-chip', 'aria-label': t('daily_streak', { n: S().daily.streak }) }, [UI.icon('flame', 'ico-sm flame', true), h('b', { text: String(S().daily.streak) })]);
  }
  function hintChip() {
    return h('div', { class: 'chip', 'data-id': 'hint-chip', 'aria-label': t('stat_hints') + ' ' + MZ.Economy.balance() }, [UI.icon('bulb', 'ico-sm'), h('b', { text: String(MZ.Economy.balance()) })]);
  }

  // ---- Ödüllü reklam akışı (sahte) ----
  UI.watchRewarded = function (purpose, cb) {
    var today = U.todayISO(), E = MZ.Economy;
    if (!E.canWatch(purpose, today)) { UI.toast(t('hint_ad_unavailable')); return; }
    UI.fakeAd('rewarded').then(function (ok) {
      var r = E.finishRewarded(purpose, ok, Date.now(), today);
      MZ.adLog.push({ type: 'rewarded-' + r.kind, add: r.add });
      if (r.kind === 'hint') UI.hintToast('', r.add);
      else if (r.kind === 'streak') UI.toast(t('streak_rescued'));
      else if (r.kind === 'gift') UI.hintToast(t('hint_gift'), r.add);
      else UI.toast(t('hint_ad_unavailable'));
      if (cb) cb(ok);
      if (purpose === 'streak' && cur.name === 'daily') UI.render();
    });
  };
  UI.doRemoveAds = function () {
    MZ.Economy.removeAds(U.todayISO());
    console.log('[MZ-AD] Reklamları kaldır: SAHTE satın alma tamamlandı, reklamsız mod açık');
    UI.toast(t('ads_removed'));
    if (cur.name !== 'game') UI.render(); else UI.refreshGameControls();
  };

  // ---- Menü ----
  UI.screens.menu = function (root) {
    var d = S().daily, today = U.todayISO(), done = MZ.Daily.isDone(d, today);
    var btn = function (id, icon, key, fn, extra) {
      return h('button', { class: 'btn big-btn' + (id === 'play' ? ' primary' : ''), 'data-id': id, on: { click: fn } }, [UI.icon(icon, 'ico-lg', icon === 'play'), h('span', { text: t(key) }), extra || null]);
    };
    root.appendChild(h('div', { class: 'menu' }, [
      h('div', { class: 'chips' }, [streakChip(), hintChip()]),
      h('div', { class: 'brand' }, [h('div', { class: 'logo', 'aria-hidden': 'true', html: logoSVG() }), h('h1', { class: 'title', text: t('app_name') })]),
      h('nav', { class: 'menu-btns' }, [
        btn('play', 'play', 'menu_play', function () { UI.go('packs'); }),
        btn('daily', 'cal', 'menu_daily', function () { UI.go('daily'); }, done ? h('span', { class: 'done-mark', 'aria-hidden': 'true' }, [UI.icon('check', 'ico-sm')]) : null),
        btn('collection', 'tiles', 'menu_collection', function () { UI.go('collection'); }),
        btn('settings', 'sliders', 'menu_settings', function () { UI.go('settings'); })
      ]),
      h('p', { class: 'foot', text: C.developer })
    ]));
  };
  function logoSVG() {
    var cols = ['--r0', '--r1', '--r2', '--r3'], s = '<svg viewBox="0 0 48 48" width="72" height="72">';
    for (var i = 0; i < 4; i++) s += '<rect x="' + (4 + (i % 2) * 21) + '" y="' + (4 + Math.floor(i / 2) * 21) + '" width="19" height="19" rx="3" fill="var(' + cols[i] + ')" stroke="var(--region-border)" stroke-width="2"/>';
    return s + '<path d="M24 14l5 3v6l-5 3-5-3v-6z" fill="var(--stone)" stroke="var(--stone-ink)"/></svg>';
  }

  // ---- Paket seçimi ----
  var packStats = function (p) { return MZ.Progress.packStats(p); };
  UI.packLock = function (pi) { return MZ.Progress.packLock(pi, MZ.Util.param('unlock') === '1'); };
  UI.screens.packs = function (root) {
    var list = h('div', { class: 'pack-list' });
    C.packs.forEach(function (p, i) {
      var st = packStats(p), lk = UI.packLock(i), sz = MZ.Data.packSizes(p);
      var card = h('button', { class: 'pack-card' + (lk.locked ? ' locked' : ''), 'data-id': 'pack-' + p, 'aria-disabled': lk.locked ? 'true' : null,
        on: { click: function () { if (lk.locked) { UI.toast(t('pack_locked', { n: lk.remaining })); return; } UI.go('packBoard', { pack: p }); } } }, [
        h('span', { class: 'pack-swatch reg-' + i }),
        h('span', { class: 'pack-main' }, [
          h('b', { class: 'pack-name', text: t('diff_' + (i + 1)) }),
          h('span', { class: 'pack-sub', dir: 'ltr', text: sz[0] ? (sz[0] === sz[1] ? sz[0] + '×' + sz[0] : sz[0] + '×' + sz[0] + '–' + sz[1] + '×' + sz[1]) : '' })
        ]),
        lk.locked ? h('span', { class: 'pack-lock' }, [UI.icon('lock', 'ico-sm'), h('span', { text: t('pack_locked', { n: lk.remaining }) })])
          : h('span', { class: 'pack-prog' }, [h('span', { dir: 'ltr', text: st.done + '/' + st.total }), h('span', { class: 'pack-stars' }, [UI.icon('star', 'ico-sm on', true), document.createTextNode(String(st.stars))])])
      ]);
      list.appendChild(card);
    });
    var banner = (C.ads.bannerEnabled || U.param('banner') === '1') && !MZ.Economy.adFree()
      ? h('div', { class: 'banner-slot', 'data-id': 'banner', role: 'complementary' }, [h('span', { text: t('ad_preview') })]) : null;
    root.appendChild(h('div', { class: 'page' }, [topbar(t('menu_play'), { right: hintChip() }), list, banner]));
  };

  // ---- Paket panosu ----
  UI.screens.packBoard = function (root, p) {
    var pack = p.pack, pi = C.packs.indexOf(pack), levels = MZ.Data.packs[pack], P = S().progress.levels;
    var grid = h('div', { class: 'tile-grid' });
    levels.forEach(function (l, i) {
      var r = P[l.id], st = r ? r.stars : 0;
      var tile = h('button', { class: 'lv-tile' + (st ? ' done reg-' + pi : ''), 'data-id': 'lv-' + l.id, 'aria-label': t('level_n', { n: i + 1 }) + (st ? ', ' + t('a11y_stars', { n: st }) : ''),
        on: { click: function () { UI.startLevel(l, false); } } }, [
        h('span', { class: 'lv-n', text: String(i + 1) }),
        h('span', { class: 'lv-stars', 'aria-hidden': 'true' }, [0, 1, 2].map(function (k) { return UI.icon('star', 'star' + (k < st ? ' on' : ''), k < st); }))
      ]);
      grid.appendChild(tile);
    });
    var stt = packStats(pack);
    root.appendChild(h('div', { class: 'page' }, [
      topbar(t('diff_' + (pi + 1)), { right: h('div', { class: 'chip' }, [UI.icon('star', 'ico-sm on', true), h('b', { text: String(stt.stars) })]) }),
      grid
    ]));
  };

  // ---- Günlük ----
  UI.screens.daily = function (root) {
    var d = S().daily, today = U.todayISO(), D = MZ.Daily;
    var realDay = U.realTodayISO();
    var ev = D.evaluate(d, today); MZ.State.save();
    if (ev.protectedDays) UI.toast(t('streak_protected'));
    var done = D.isDone(d, today), dayNo = D.dayNumber(today), pz = D.pick(MZ.Data.daily, today);
    var diff = pz ? D.packIndex(pz.pack) : D.targetDiff(today);
    var kids = [
      h('div', { class: 'daily-no', 'data-id': 'daily-no', text: '#' + dayNo }),
      h('div', { class: 'daily-diff' }, [h('b', { text: t('diff_' + diff) }), h('span', { class: 'sub', dir: 'ltr', text: pz ? pz.n + '×' + pz.n : '' })]),
      h('div', { class: 'daily-date', dir: 'ltr', text: today }),
      h('div', { class: 'streak-box' }, [
        h('div', { class: 'big-streak', 'data-id': 'daily-streak' }, [UI.icon('flame', 'ico-lg flame', true), h('b', { text: String(d.streak) })]),
        h('div', { class: 'shields', 'aria-label': t('streak_protected') + ' ' + d.shields }, [UI.icon('shield', 'ico-sm'), h('b', { 'data-id': 'shields', text: String(d.shields) })])
      ])
    ];
    var btns = [];
    if (D.canRescue(d, today)) {
      kids.push(h('p', { class: 'warn', text: t('streak_broken') }));
      btns.push(h('button', { class: 'btn primary', 'data-id': 'rescue', on: { click: function () { UI.watchRewarded('streak'); } } }, [UI.icon('adplay', 'ico-sm', true), document.createTextNode(' ' + t('streak_save'))]));
    }
    if (done) {
      var rec = d.done[today], cd = h('div', { class: 'next-in', 'data-id': 'next-in' });
      var upd = function () { cd.textContent = t('daily_next_in', { time: U.fmtClock(U.msToMidnight()) }); };
      upd(); tickTimer = setInterval(function () { if (!U.mockDate() && U.realTodayISO() !== realDay) { MZ.boot.rollover(); return; } upd(); }, 1000);
      kids.push(h('div', { class: 'done-line' }, [UI.icon('check', 'ico-sm'), h('b', { text: t('daily_done') })]), cd);
      var txt = MZ.Share.build({ dayNo: rec.dayNo || dayNo, time: rec.time, hints: rec.hints, errors: rec.errors, stars: rec.stars, streak: rec.streak, strip: rec.strip, rtl: MZ.I18n.isRTL() });
      btns.push(h('button', { class: 'btn primary', 'data-id': 'share', on: { click: function () { UI.shareText(txt); } } }, [UI.icon('share', 'ico-sm'), document.createTextNode(' ' + t('btn_share'))]));
      btns.push(h('button', { class: 'btn', 'data-id': 'daily-replay', text: t('btn_retry'), on: { click: function () { UI.startDaily(true); } } }));
    } else {
      btns.push(h('button', { class: 'btn primary big-btn', 'data-id': 'daily-play', on: { click: function () { UI.startDaily(false); } } }, [UI.icon('play', 'ico-lg', true), h('span', { text: t('menu_play') })]));
    }
    kids.push(h('div', { class: 'col-btns' }, btns));
    root.appendChild(h('div', { class: 'page' }, [topbar(t('daily_title'), { right: hintChip() }), h('div', { class: 'daily' }, kids)]));
  };

  // ---- Çini Atölyesi (SVG yer tutucu motifler) ----
  function tile(kind, x, y, s, stars, pi, r, c) {
    var cx = x + s / 2, cy = y + s / 2, g1 = 'var(--r' + ((pi * 2) % 10) + ')', g2 = 'var(--r' + ((pi * 2 + 3) % 10) + ')';
    if (stars === 0) return '<rect x="' + (x + .5) + '" y="' + (y + .5) + '" width="' + (s - 1) + '" height="' + (s - 1) + '" fill="none" stroke="var(--grid-line)" stroke-width=".5" stroke-dasharray="1.5 1.5"/>';
    var plain = stars === 1, bg = plain ? 'var(--surface-2)' : g2, fg = plain ? 'var(--text-2)' : g1, st = 'var(--region-border)', rot = ((r + c) % 2) * 45, q = s * .36, o = '';
    o += '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="' + bg + '"/>';
    o += '<g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" fill="' + fg + '" stroke="' + st + '" stroke-width=".5">';
    var k = kind % 5;
    if (k === 0) o += '<path d="M' + cx + ' ' + (cy - q) + 'L' + (cx + q) + ' ' + cy + 'L' + cx + ' ' + (cy + q) + 'L' + (cx - q) + ' ' + cy + 'Z"/><circle cx="' + cx + '" cy="' + cy + '" r="' + q * .35 + '" fill="' + bg + '"/>';
    else if (k === 1) o += [0, 90, 180, 270].map(function (a) { return '<ellipse cx="' + cx + '" cy="' + (cy - q * .55) + '" rx="' + q * .35 + '" ry="' + q * .6 + '" transform="rotate(' + a + ' ' + cx + ' ' + cy + ')"/>'; }).join('');
    else if (k === 2) o += '<rect x="' + (cx - q * .8) + '" y="' + (cy - q * .8) + '" width="' + q * 1.6 + '" height="' + q * 1.6 + '"/><rect x="' + (cx - q * .8) + '" y="' + (cy - q * .8) + '" width="' + q * 1.6 + '" height="' + q * 1.6 + '" transform="rotate(45 ' + cx + ' ' + cy + ')"/>';
    else if (k === 3) { var pts = []; for (var i = 0; i < 6; i++) pts.push((cx + q * Math.cos(i * Math.PI / 3)).toFixed(2) + ',' + (cy + q * Math.sin(i * Math.PI / 3)).toFixed(2)); o += '<polygon points="' + pts.join(' ') + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + q * .3 + '" fill="' + bg + '"/>'; }
    else o += '<rect x="' + (cx - q) + '" y="' + (cy - q) + '" width="' + q * 2 + '" height="' + q * 2 + '"/><rect x="' + (cx - q * .6) + '" y="' + (cy - q * .6) + '" width="' + q * 1.2 + '" height="' + q * 1.2 + '" fill="' + bg + '"/>';
    o += '</g>';
    if (stars >= 3) o += '<rect x="' + (x + .8) + '" y="' + (y + .8) + '" width="' + (s - 1.6) + '" height="' + (s - 1.6) + '" fill="none" stroke="var(--accent)" stroke-width="1.2"/>';
    return o;
  }
  function pano(cols, starsArr, pi, label) {
    var s = 10, rows = Math.max(1, Math.ceil(starsArr.length / cols)), o = '';
    for (var i = 0; i < starsArr.length; i++) o += tile(pi, (i % cols) * s, Math.floor(i / cols) * s, s, starsArr[i], pi, Math.floor(i / cols), i % cols);
    return '<svg class="pano" viewBox="0 0 ' + cols * s + ' ' + rows * s + '" role="img" aria-label="' + label + '">' + o + '</svg>';
  }
  UI.screens.collection = function (root) {
    MZ.Progress.checkGallery();
    var P = S().progress.levels, today = U.todayISO(), kids = [];
    C.packs.forEach(function (p, i) {
      var list = MZ.Data.packs[p], arr = list.map(function (l) { return P[l.id] ? P[l.id].stars : 0; }), got = arr.filter(function (x) { return x > 0; }).length;
      var full = list.length > 0 && got === list.length;
      kids.push(h('section', { class: 'col-card', 'data-id': 'col-' + p }, [
        h('div', { class: 'col-head' }, [h('b', { text: t('diff_' + (i + 1)) }), h('span', { class: 'sub', dir: 'ltr', text: got + '/' + list.length }), full ? h('span', { class: 'ok' }, [UI.icon('check', 'ico-sm'), document.createTextNode(' ' + t('col_complete'))]) : null]),
        h('div', { class: 'pano-wrap', html: pano(10, arr, i, t('diff_' + (i + 1))) })
      ]));
    });
    // Ay panosu
    var mi = MZ.Daily.monthInfo(today), arr2 = mi.days.map(function (d) { return S().daily.done[d] ? 3 : 0; }), got2 = arr2.filter(Boolean).length;
    var mname = '';
    try { mname = new Intl.DateTimeFormat(MZ.I18n.get() + '-u-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(mi.y, mi.m - 1, 15))); } catch (e) { mname = mi.y + '-' + U.pad2(mi.m); }
    kids.push(h('section', { class: 'col-card', 'data-id': 'col-month' }, [
      h('div', { class: 'col-head' }, [h('b', { text: t('col_month') }), h('span', { class: 'sub', text: mname }), h('span', { class: 'sub', dir: 'ltr', text: got2 + '/' + mi.days.length }),
        got2 === mi.days.length ? h('span', { class: 'ok' }, [UI.icon('check', 'ico-sm'), document.createTextNode(' ' + t('col_complete'))]) : null]),
      h('div', { class: 'pano-wrap', html: pano(7, arr2, 4, t('col_month')) })
    ]));
    // Galeri
    var gal = S().gallery;
    if (gal.length) kids.push(h('section', { class: 'col-card', 'data-id': 'gallery' }, [h('div', { class: 'col-head' }, [h('b', { text: t('col_gallery') })]),
      h('div', { class: 'gallery' }, gal.map(function (x) { var pi = x.t === 'pack' ? C.packs.indexOf(x.k) : 4; return h('div', { class: 'gal-item', 'data-id': 'gal-' + x.t + '-' + x.k, html: pano(2, [3, 3, 3, 3], pi, x.k) }); }))]));
    root.appendChild(h('div', { class: 'page' }, [topbar(t('col_title'), { right: hintChip() }), h('div', { class: 'col-list' }, kids)]));
  };

  // ---- Ayarlar ----
  UI.setStyle = function (s) {
    var a = document.getElementById('tok-a'), b = document.getElementById('tok-b');
    if (!a || !b) return;
    a.media = s === 'b' ? 'not all' : 'all'; b.media = s === 'b' ? 'all' : 'not all';
    document.documentElement.setAttribute('data-style', s === 'b' ? 'b' : 'a');
  };
  UI.screens.settings = function (root) {
    var st = S().settings, devTaps = 0;
    function row(label, ctl, id) { return h('div', { class: 'set-row', 'data-id': id }, [h('span', { class: 'set-label', text: label }), ctl]); }
    function sw(key, onchg) {
      var b = h('button', { class: 'switch', role: 'switch', 'aria-checked': st[key] ? 'true' : 'false', 'data-id': 'sw-' + key, 'aria-label': t(({ autoX: 'set_autox', showErrors: 'set_errors', quickStone: 'set_quick_stone', sound: 'set_sound', haptic: 'set_haptic' })[key]) }, [h('i')]);
      b.addEventListener('click', function () { st[key] = !st[key]; b.setAttribute('aria-checked', st[key] ? 'true' : 'false'); MZ.State.save(); if (onchg) onchg(); });
      return b;
    }
    var langSel = h('select', { class: 'select', 'data-id': 'lang', 'aria-label': t('set_language') }, C.languages.map(function (l) { return h('option', { value: l, text: C.languageNames[l] }); }));
    langSel.value = MZ.I18n.get();
    langSel.addEventListener('change', function () { S().lang = langSel.value; MZ.State.save(); MZ.I18n.set(langSel.value); UI.applyLang(); UI.render(); });
    var seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': t('set_theme') }, ['light', 'dark', 'system'].map(function (v) {
      var b = h('button', { class: 'seg-b', role: 'radio', 'aria-checked': st.theme === v ? 'true' : 'false', 'data-id': 'theme-' + v, text: t('theme_' + v) });
      b.addEventListener('click', function () { st.theme = v; MZ.State.save(); UI.applyTheme(); UI.render(); });
      return b;
    }));
    var ad = MZ.Economy.adFree();
    var devRow = h('div', { class: 'set-row dev', 'data-id': 'dev-row', style: 'display:none' }, [h('span', { class: 'set-label', text: 'style' }), h('div', { class: 'seg' }, ['a', 'b'].map(function (v) {
      var b = h('button', { class: 'seg-b', 'data-id': 'style-' + v, 'aria-checked': (document.documentElement.getAttribute('data-style') || 'a') === v ? 'true' : 'false', text: v.toUpperCase() });
      b.addEventListener('click', function () { UI.setStyle(v); S().settings.style = v; MZ.State.save(); UI.render(); });
      return b;
    }))]);
    var about = h('button', { class: 'about', 'data-id': 'about', text: t('set_about'), on: { click: function () {
      devTaps++; if (devTaps >= 5) { devRow.style.display = ''; devTaps = 0; }
    } } });
    var list = h('div', { class: 'set-list' }, [
      row(t('set_language'), langSel, 'row-lang'), row(t('set_theme'), seg, 'row-theme'),
      row(t('set_autox'), sw('autoX'), 'row-autox'), row(t('set_errors'), sw('showErrors'), 'row-errors'), row(t('set_quick_stone'), sw('quickStone'), 'row-quick'),
      row(t('set_sound'), sw('sound'), 'row-sound'), row(t('set_haptic'), sw('haptic'), 'row-haptic'),
      h('button', { class: 'btn wide', 'data-id': 'remove-ads', disabled: ad ? 'true' : null, text: t('set_remove_ads'), on: { click: function () { UI.doRemoveAds(); } } }),
      h('button', { class: 'btn wide', 'data-id': 'restore', text: t('set_restore'), on: { click: function () {
        if (MZ.Economy.restore()) { UI.toast(t('restore_done')); UI.render(); } else UI.toast(t('restore_none'));
      } } }),
      h('a', { class: 'btn wide', 'data-id': 'privacy', href: C.privacyUrl, target: '_blank', rel: 'noopener', text: t('set_privacy') }),
      h('a', { class: 'btn wide', 'data-id': 'support', href: 'mailto:' + C.supportEmail, 'dir': 'ltr' }, [h('span', { text: t('set_support') + ': ' + C.supportEmail })]),
      h('button', { class: 'btn wide danger', 'data-id': 'reset', text: t('set_reset'), on: { click: function () {
        UI.confirm(t('reset_confirm'), function () {
          MZ.State.reset(); MZ.boot.applyAll(); UI.toast(t('btn_ok'));
          if (!MZ.State.data.flags.tutorialDone && MZ.Data.tutorial.length) UI.startTutorial(0); else UI.go('menu');
        });
      } } }),
      devRow, about
    ]);
    root.appendChild(h('div', { class: 'page' }, [topbar(t('menu_settings')), list]));
  };
})();
