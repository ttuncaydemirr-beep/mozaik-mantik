/* Oyun ekranı: tahta çizimi, dokunma/sürükleme, ipucu akışı, sonuç kartı, öğretici. */
(function () {
  var MZ = window.MZ, UI = MZ.UI, h = UI.h, U = MZ.Util, C = MZ.Config, L = MZ.Logic;
  var t = function (k, p) { return MZ.I18n.t(k, p); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var BORDER = 3;
  var G = UI.G = { game: null, spec: null, hint: null, el: {}, cells: [], base: [], gesture: null, focus: 0, tick: null, last: 0, shownAt: 0 };

  function S() { return MZ.State.data; }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // ---------- Başlatma
  function slotOf(spec) { return spec.mode === 'daily' ? 'currentDaily' : 'current'; }
  function makeGame(spec) {
    var lv = spec.level, set = S().settings;
    var mk = function () {
      return new L.Game({ n: lv.n, regions: lv.regions, solution: lv.solution, mode: spec.mode,
        settings: { autoX: spec.mode === 'tutorial' ? true : set.autoX, quickStone: set.quickStone },
        tutFirst: (spec.mode === 'tutorial' && lv.firstHint && lv.firstHint.place && lv.firstHint.place[0]) ? lv.firstHint.place[0][0] * lv.n + lv.firstHint.place[0][1] : null });
    };
    var g = mk();
    var key = spec.mode === 'daily' ? 'daily:' + spec.date : spec.mode === 'tutorial' ? null : 'level:' + lv.id;
    spec.key = key;
    if (key) {
      var slot = slotOf(spec), cur = S()[slot];
      if (spec.fresh && cur && cur.key === key) { S()[slot] = null; cur = null; }
      if (cur && cur.key === key && cur.g) { try { g.restore(cur.g); } catch (e) { g = mk(); S()[slot] = null; } }
    }
    return g;
  }
  function open(spec) {
    G.spec = spec; G.game = makeGame(spec); G.cardShownAt = 0; G.zoomRatio = 1; G.busy = false;
    UI.go('game');
  }
  UI.startLevel = function (level, fresh) { open({ mode: 'level', level: level, fresh: fresh }); };
  UI.startDaily = function (fresh) {
    var today = U.todayISO(), p = MZ.Daily.pick(MZ.Data.daily, today);
    if (!p) { UI.toast(t('hint_nothing')); return; }
    open({ mode: 'daily', level: p, date: today, fresh: fresh });
  };
  UI.startTutorial = function (i) {
    var list = MZ.Data.tutorial;
    if (!list.length || i >= list.length) { endTutorial(); return; }
    open({ mode: 'tutorial', level: list[i], tutIndex: i, fresh: true });
  };
  function endTutorial() { S().flags.tutorialDone = true; MZ.State.save(); G.game = null; UI.go('menu'); }

  function saveCurrent() {
    var g = G.game, sp = G.spec;
    if (!g || !sp || !sp.key || g.won) return;
    S()[slotOf(sp)] = { key: sp.key, g: g.serialize() }; MZ.State.save();
  }
  UI.saveCurrent = saveCurrent;
  UI.leaveGame = function () { stopTick(); saveCurrent(); };

  // ---------- Ekran kurulumu
  UI.screens.game = function (root) {
    var g = G.game, sp = G.spec, n = g.n, tut = sp.mode === 'tutorial';
    var el = G.el = {};
    var title = tut ? t('tut_1').length && '' : '';
    var topLeft, topTitle;
    if (tut) topLeft = h('button', { class: 'btn ghost', 'data-id': 'skip', text: t('btn_skip'), on: { click: function () { stopTick(); endTutorial(); } } });
    else topLeft = h('button', { class: 'icon-btn flip', 'aria-label': t('btn_back'), 'data-id': 'back', on: { click: function () { UI.leaveGame(); UI.back(); } } }, [UI.icon('back')]);
    var lvLabel = sp.mode === 'daily' ? t('daily_title') + ' #' + MZ.Daily.dayNumber(sp.date)
      : tut ? '' : t('level_n', { n: (MZ.Data.packs[sp.level.pack].indexOf(sp.level) + 1) });
    el.timer = h('span', { class: 'timer', 'data-id': 'timer', text: '00:00' });
    var bar = h('header', { class: 'topbar' }, [topLeft, h('h1', { class: 'bar-title', text: lvLabel }), el.timer]);
    el.info = h('div', { class: 'infoline', 'data-id': 'info', 'aria-live': 'polite' });
    el.board = h('div', { class: 'board', role: 'grid', tabindex: '0', 'aria-label': t('a11y_board'), style: '--n:' + n });
    el.zoomBtn = h('button', { class: 'icon-btn big zoom-btn', 'data-id': 'zoom', 'aria-label': t('a11y_zoom'), 'aria-pressed': 'false', style: 'display:none', on: { click: toggleZoom } }, [UI.icon('zoom')]);
    el.area = h('div', { class: 'board-area' }, [h('div', { class: 'board-wrap', dir: 'ltr' }, [el.board])]);
    buildCells();
    el.undo = h('button', { class: 'icon-btn big', 'data-id': 'undo', 'aria-label': t('game_undo'), on: { click: doUndo } }, [UI.icon('undo')]);
    el.redo = h('button', { class: 'icon-btn big', 'data-id': 'redo', 'aria-label': t('game_redo'), on: { click: doRedo } }, [UI.icon('redo')]);
    el.hint = h('button', { class: 'btn hint-btn', 'data-id': 'hint', on: { click: onHint } });
    var ctr = h('div', { class: 'controls' }, tut ? [] : [el.undo, el.redo, el.zoomBtn, el.hint]);
    root.appendChild(h('div', { class: 'game' + (tut ? ' tut' : '') }, [bar, el.info, el.area, ctr]));
    wireBoard(); wirePinch();
    paint(); updateControls(); updateInfo();
    layout();
    if (window.ResizeObserver) { G.ro = new ResizeObserver(layout); G.ro.observe(el.area); }
    window.addEventListener('resize', layout);
    G.last = performance.now(); startTick(); updateTimer();
    // İlk gerçek seviyede ipucu balonu (metinsiz, bir kez)
    if (sp.mode === 'level' && C.game.hintIntroOnce && !S().flags.hintIntroShown && !MZ.Data.packs.cirak.some(function (l) { return S().progress.levels[l.id]; })) {
      el.hint.classList.add('intro');
      el.hint.appendChild(h('span', { class: 'bubble', 'aria-hidden': 'true' }, [UI.icon('bulb')]));
      S().flags.hintIntroShown = true; MZ.State.save();
    }
    if (g.won) {}
  };
  UI.cleanups.game = function () {
    stopTick(); window.removeEventListener('resize', layout);
    if (G.ro) { G.ro.disconnect(); G.ro = null; }
  };

  function startTick() {
    stopTick();
    G.tick = setInterval(function () {
      var now = performance.now(), dt = now - G.last; G.last = now;
      if (!document.hidden && !UI.paused && G.game && !G.game.won) { G.game.elapsed += Math.min(dt, 1000); updateTimer(); }
    }, 250);
  }
  function stopTick() { if (G.tick) { clearInterval(G.tick); G.tick = null; } }
  function updateTimer() { if (G.el.timer && G.game) G.el.timer.textContent = U.fmtTime(G.game.elapsed); }

  // ---------- Tahta
  function buildCells() {
    var g = G.game, n = g.n, r, c, i, rg = g.rg;
    G.cells = []; G.base = [];
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
      i = r * n + c;
      var cls = 'cell reg-' + rg[r][c];
      if (c < n - 1) cls += rg[r][c + 1] !== rg[r][c] ? ' rt' : ' rn';
      if (r < n - 1) cls += rg[r + 1][c] !== rg[r][c] ? ' bt' : ' bn';
      var el = h('div', { class: cls, role: 'gridcell', 'data-r': r, 'data-c': c });
      G.base[i] = cls; G.cells[i] = el; G.el.board.appendChild(el);
    }
  }
  function stoneSVG() {
    return '<svg class="stone" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8.2 4.6v9.8L12 21.5l-8.2-4.6V7.1z" fill="var(--stone)" stroke="var(--stone-ink)" stroke-width="1.3"/><path d="M12 6.8l4.4 2.5v5.4L12 17.2l-4.4-2.5V9.3z" fill="none" stroke="var(--stone-ink)" stroke-width="1.3"/></svg>';
  }
  function xSVG(auto) {
    return '<svg class="xmark' + (auto ? ' auto' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="var(--mark)" stroke-width="' + (auto ? 1.5 : 2.6) + '" stroke-linecap="round" fill="none"/></svg>';
  }
  function setCell(px) {
    G.cellPx = px; G.el.board.style.setProperty('--cell', px + 'px');
    G.zoomRatio = px / G.baseCell;
    if (G.el.zoomBtn) G.el.zoomBtn.setAttribute('aria-pressed', px > G.baseCell + 0.5 ? 'true' : 'false');
  }
  function zoomable() { return G.game.n >= 9 && G.baseCell < 44; }
  function layout() {
    if (!G.el.area || !G.game) return;
    var n = G.game.n, a = G.el.area, w = a.clientWidth, hh = a.clientHeight, pad = 4;
    var size = Math.min(w, hh) - pad * 2, cell = Math.floor((size - BORDER * 2) / n);
    cell = U.clamp(cell, 12, C.game.maxCellPx);
    G.baseCell = cell;
    setCell(zoomable() ? U.clamp(Math.round(cell * (G.zoomRatio || 1)), cell, C.game.maxCellPx) : cell);
    G.el.zoomBtn.style.display = zoomable() ? '' : 'none';
    if (n >= 10 && cell < C.game.minCellPx) {
      console.warn('[MZ] 10x10 tahtada hücre ' + cell + 'px < ' + C.game.minCellPx + 'px (erişilebilirlik uyarısı)');
      MZ.cellWarning = cell;
    }
  }
  // Yakınlaştırma: ankraj noktasındaki tahta noktası yerinde kalır
  function zoomTo(px, ax, ay) {
    var a = G.el.area, b = G.el.board, r = b.getBoundingClientRect(), fx = (ax - r.left) / r.width, fy = (ay - r.top) / r.height;
    setCell(Math.round(U.clamp(px, G.baseCell, C.game.maxCellPx)));
    var r2 = b.getBoundingClientRect();
    a.scrollLeft += (r2.left + fx * r2.width) - ax; a.scrollTop += (r2.top + fy * r2.height) - ay;
  }
  function areaCenter() { var r = G.el.area.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function toggleZoom() {
    if (!zoomable()) return;
    var c = areaCenter();
    if (G.cellPx > G.baseCell) { zoomTo(G.baseCell, c[0], c[1]); G.el.area.scrollLeft = 0; G.el.area.scrollTop = 0; }
    else zoomTo(44, c[0], c[1]);
  }
  UI.zoomInfo = function () { return { base: G.baseCell, cell: G.cellPx, zoomable: zoomable() }; };
  function aria(i, v) {
    var r = Math.floor(i / G.game.n), c = i % G.game.n;
    return t('a11y_cell', { row: r + 1, col: c + 1, region: G.game.regionAt(i) + 1, state: t(v === 2 ? 'a11y_state_stone' : (v === 1 || v === 3) ? 'a11y_state_x' : 'a11y_state_empty') });
  }
  function paint() {
    var g = G.game, n = g.n, i, v, conf = S().settings.showErrors ? g.conflictSet() : {}, hl = {}, elim = {}, place = {}, badHl = {};
    var hint = g.hint, tgt = null;
    if (hint) {
      var hh = hint.h;
      (hh.areas && hh.areas.length ? hh.areas : [hh.area]).forEach(function (a) { g.areaCells(a).forEach(function (x) { hl[x] = 1; }); });
      if (hint.stage >= 2) {
        (hh.eliminate || []).forEach(function (p) { elim[p[0] * n + p[1]] = 1; });
        (hh.place || []).forEach(function (p) { place[p[0] * n + p[1]] = 1; });
        (hh.cells || []).forEach(function (p) { badHl[p[0] * n + p[1]] = 1; });
      }
    }
    if (g.mode === 'tutorial' && !g.won) tgt = g.nextTutorialTarget();
    for (i = 0; i < g.cells.length; i++) {
      v = g.cells[i];
      var cls = G.base[i];
      if (v === 2) cls += ' stone-on'; else if (v === 1) cls += ' x-on'; else if (v === 3) cls += ' ax-on';
      if (conf[i] && v === 2) cls += ' bad';
      if (hl[i]) cls += ' hl';
      if (elim[i]) cls += ' hint-elim';
      if (place[i]) cls += ' hint-place';
      if (badHl[i]) cls += ' hint-bad';
      if (tgt === i) cls += ' tut-target';
      if (G.focus === i) cls += ' focus';
      var el = G.cells[i];
      if (el.className !== cls) el.className = cls;
      var key = v + (elim[i] ? 'e' : '');
      if (el._k !== key) {
        el._k = key;
        el.innerHTML = v === 2 ? stoneSVG() : v === 1 ? xSVG(false) : v === 3 ? xSVG(true) : (elim[i] ? xSVG(false) : '');
      }
      var al = aria(i, v); if (el._a !== al) { el._a = al; el.setAttribute('aria-label', al); }
    }
    if (G.el.board) G.el.board.classList.toggle('won', g.won);
    updateControls();
  }
  function flash(areas) {
    var g = G.game, set = {};
    areas.forEach(function (a) {
      if (a.type === 'nbr') { var r = Math.floor(a.index / g.n), c = a.index % g.n; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { var rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < g.n && cc < g.n) set[rr * g.n + cc] = 1; } }
      else g.areaCells(a).forEach(function (i) { set[i] = 1; });
    });
    var els = Object.keys(set).map(function (i) { return G.cells[i]; });
    els.forEach(function (e) { e.classList.add('flash'); });
    setTimeout(function () { els.forEach(function (e) { e.classList.remove('flash'); }); }, 1100);
  }

  // ---------- Girdi
  function cellAt(e) {
    var rect = G.el.board.getBoundingClientRect(), cell = G.cellPx, n = G.game.n;
    var x = e.clientX - rect.left - BORDER, y = e.clientY - rect.top - BORDER;
    var c = Math.floor(x / cell), r = Math.floor(y / cell);
    if (c < 0 || r < 0 || c >= n || r >= n) {
      if (x > -BORDER - 6 && y > -BORDER - 6 && x < cell * n + BORDER + 6 && y < cell * n + BORDER + 6) return [U.clamp(r, 0, n - 1), U.clamp(c, 0, n - 1)];
      return null;
    }
    return [r, c];
  }
  var ptrs = {};
  function nptr() { return Object.keys(ptrs).length; }
  function cancelGesture() {
    var gs = G.gesture; if (!gs) return;
    clearTimeout(gs.timer); if (gs.dragging) G.game.dragCancel(); G.gesture = null; paint();
  }
  function wireBoard() {
    var b = G.el.board;
    b.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || G.game.won || UI.paused) return;
      if (G.gesture || nptr() > 0) return;                 // ikinci parmak: yeni hareket başlatma
      var ci = cellAt(e); if (!ci) return;
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch (x) {}
      var gs = G.gesture = { id: e.pointerId, start: ci, last: ci, dragging: false, lp: false };
      gs.timer = setTimeout(function () { if (G.gesture !== gs) return; gs.lp = true; afterMove(G.game.longPress(ci[0], ci[1]), true); }, C.game.longPressMs);
    });
    b.addEventListener('pointermove', function (e) {
      var gs = G.gesture; if (!gs || e.pointerId !== gs.id) return;
      var ci = cellAt(e); if (!ci || (ci[0] === gs.last[0] && ci[1] === gs.last[1])) return;
      clearTimeout(gs.timer);
      if (gs.lp) return;
      if (!gs.dragging) {
        gs.dragging = true;
        if (G.game.mode !== 'tutorial') { gs.mode = G.game.dragBegin(gs.start[0], gs.start[1]); if (gs.mode) G.game.dragOver(gs.start[0], gs.start[1]); }
      }
      if (G.game.mode !== 'tutorial') G.game.dragOver(ci[0], ci[1]);
      gs.last = ci; paint();
    });
    function up(e) {
      var gs = G.gesture; if (!gs || e.pointerId !== gs.id) return; G.gesture = null; clearTimeout(gs.timer);
      if (gs.dragging) { if (G.game.mode !== 'tutorial' && G.game.dragEnd()) { UI.beep(300, 0.04); afterMove({ changed: true }, false); } else paint(); }
      else if (!gs.lp) doTap(gs.start);
    }
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', function (e) { var gs = G.gesture; if (gs && e.pointerId === gs.id) cancelGesture(); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('keydown', function (e) {
      var n = G.game.n, f = G.focus, r = Math.floor(f / n), c = f % n, k = e.key;
      if (k === 'ArrowRight') c = Math.min(n - 1, c + 1); else if (k === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (k === 'ArrowDown') r = Math.min(n - 1, r + 1); else if (k === 'ArrowUp') r = Math.max(0, r - 1);
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); doTap([r, c]); return; }
      else if (k === 's' || k === 'S') { afterMove(G.game.longPress(r, c), true); return; }
      else return;
      e.preventDefault(); G.focus = r * n + c; paint();
    });
  }
  // İki parmak: tek parmak jesti iptal (hayalet taş yok); 9x9/10x10'da pinch ile yakınlaştırma, iki parmakla kaydırma
  function wirePinch() {
    var a = G.el.area; ptrs = {}; G.pinch = null;
    function pts() { var ids = Object.keys(ptrs); return [ptrs[ids[0]], ptrs[ids[1]]]; }
    a.addEventListener('pointerdown', function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (nptr() >= 2) {
        cancelGesture();
        var p = pts(), dx = p[0].x - p[1].x, dy = p[0].y - p[1].y;
        G.pinch = { d0: Math.max(10, Math.hypot(dx, dy)), cell0: G.cellPx, mid: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } };
      }
    });
    a.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      if (!G.pinch || nptr() < 2) return;
      var p = pts(), mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (zoomable()) {
        a.scrollLeft -= mid.x - G.pinch.mid.x; a.scrollTop -= mid.y - G.pinch.mid.y;
        zoomTo(G.pinch.cell0 * d / G.pinch.d0, mid.x, mid.y);
      }
      G.pinch.mid = mid;
    });
    function end(e) {
      delete ptrs[e.pointerId];
      if (G.pinch && nptr() < 2) {
        G.pinch = null;
        if (zoomable() && G.cellPx > G.baseCell && G.cellPx < 44) { var c = areaCenter(); zoomTo(G.cellPx < (G.baseCell + 44) / 2 ? G.baseCell : 44, c[0], c[1]); if (G.cellPx === G.baseCell) { a.scrollLeft = 0; a.scrollTop = 0; } }
      }
    }
    a.addEventListener('pointerup', end); a.addEventListener('pointercancel', end);
  }
  function doTap(ci) {
    G.focus = ci[0] * G.game.n + ci[1];
    var res = G.game.tap(ci[0], ci[1]);
    if (res.guided) { // sessiz yönlendirme: hedef hücre yeniden parlar
      var tg = G.game.nextTutorialTarget(); if (tg != null && G.cells[tg]) { var e = G.cells[tg]; e.classList.remove('nudge'); void e.offsetWidth; e.classList.add('nudge'); }
      return;
    }
    afterMove(res, true);
  }
  function afterMove(res, sound) {
    if (!res || !res.changed) { paint(); return; }
    if (sound) { UI.beep(res.placed ? 520 : 380, 0.05); UI.buzz(res.bad ? [20, 30, 20] : 10); }
    paint(); updateInfo();
    if (res.bad && res.areas && res.areas.length) flash(res.areas);
    saveCurrent();
    if (G.game.isComplete()) onWin();
  }
  function doUndo() { if (G.game.undo()) { updateInfo(); paint(); saveCurrent(); } }
  function doRedo() { if (G.game.redo()) { updateInfo(); paint(); saveCurrent(); } }

  // ---------- İpucu (3 aşama: 1 hak, 0, 1 hak)
  function updateControls() {
    var g = G.game; if (!g || !G.el.undo) return;
    G.el.undo.disabled = !g.canUndo(); G.el.redo.disabled = !g.canRedo();
    var hb = G.el.hint; if (!hb) return;
    var intro = hb.classList.contains('intro'), bubble = hb.querySelector('.bubble');
    var cost = g.hintNextCost(), bal = MZ.Economy.balance(), needAd = bal < cost, today = U.todayISO();
    hb.innerHTML = '';
    hb.classList.toggle('ad', needAd); hb.disabled = g.won;
    if (needAd) {
      var can = MZ.Economy.canWatchRewardedHint(today);
      hb.appendChild(UI.icon('adplay', 'ico-sm', true));
      hb.appendChild(h('span', { class: 'lbl', text: can ? '+' + C.hints.rewardedAmount : t('hint_ad_unavailable') }));
      hb.setAttribute('aria-label', t(can ? 'hint_watch_ad' : 'hint_ad_unavailable'));
      hb.classList.toggle('dim', !can);
    } else {
      var stage = g.hintStage();
      hb.appendChild(UI.icon('bulb', 'ico-sm'));
      hb.appendChild(h('span', { class: 'lbl', text: stage === 2 ? t('btn_apply') : t('game_hint') }));
      hb.appendChild(h('span', { class: 'pill', 'data-id': 'hint-balance', text: String(bal) }));
      hb.setAttribute('aria-label', (stage === 2 ? t('btn_apply') : t('game_hint')) + ', ' + bal);
      hb.classList.remove('dim');
    }
    var dots = h('span', { class: 'stage', 'aria-hidden': 'true' }, [0, 1, 2].map(function (k) { return h('i', { class: g.hintStage() > k ? 'on' : '' }); }));
    hb.appendChild(dots);
    if (intro && bubble) hb.appendChild(bubble);
    if (intro && !bubble) hb.classList.remove('intro');
  }
  function updateInfo() {
    var el = G.el.info; if (!el) return; el.innerHTML = '';
    var sp = G.spec;
    if (sp.mode === 'tutorial') { el.appendChild(h('span', { class: 'tut-text', 'data-id': 'tut-text', text: t(sp.level.teach || ('tut_' + (sp.tutIndex + 1))) })); return; }
    if (G.game.hint && G.game.hint.stage >= 2) {
      var hh = G.game.hint.h;
      if (hh.kind === 'conflict') el.appendChild(h('span', { class: 'tech fix', text: t('hint_fix_first') }));
      else el.appendChild(h('span', { class: 'tech' }, [h('b', { class: 'tbadge', text: 'T' + hh.tech }), document.createTextNode(' ' + t('tech_' + hh.tech))]));
    }
  }
  function onHint() {
    var g = G.game, r = g.hintPress(MZ.Economy);
    if (r.status === 'none') return;
    if (r.status === 'need-ad') { UI.watchRewarded('hint', function () { updateControls(); }); return; }
    if (r.status === 'nothing') { UI.toast(t('hint_nothing')); return; }
    if (r.status === 'applied') {
      UI.beep(560, 0.06); saveCurrent(); paint(); updateInfo();
      if (r.changed && g.isComplete()) onWin();
      return;
    }
    UI.beep(440, 0.04); paint(); updateInfo();
  }
  UI.refreshGameControls = function () { if (G.game && G.el.hint) updateControls(); };

  // ---------- Bitiş
  function onWin() {
    var g = G.game; if (g.won) return;
    g.won = true; g.hint = null; stopTick();
    var cells = G.el.board.querySelectorAll('.stone-on'), k = 0;
    cells.forEach(function (c) { c.style.setProperty('--d', (k++ * 70) + 'ms'); });
    paint(); UI.beep(700, 0.15); UI.buzz([30, 40, 60]);
    var tut = g.mode === 'tutorial';
    setTimeout(function () { if (G.game !== g) return; tut ? nextTutorial() : finish(); }, reduced() ? 250 : (tut ? 900 : C.game.winAnimMs));
  }
  function nextTutorial() { UI.startTutorial(G.spec.tutIndex + 1); }

  function finish() {
    var g = G.game, sp = G.spec;
    var info = sp.mode === 'daily' ? MZ.Progress.completeDaily(sp.date, g) : MZ.Progress.completeLevel(sp.level, g);
    if (info.hintBonus) UI.hintToast('', info.hintBonus);
    if (sp.mode === 'daily') { if (info.shield) UI.toast(t('streak_protected')); info.shareText = shareTextFor(info.record); }
    showResult(info);
  }
  function shareTextFor(rec) {
    return MZ.Share.build({ dayNo: rec.dayNo, time: rec.time, hints: rec.hints, errors: rec.errors, stars: rec.stars, streak: rec.streak, strip: rec.strip, rtl: MZ.I18n.isRTL() });
  }
  function starRow(n) {
    var row = h('div', { class: 'stars', role: 'img', 'aria-label': t('a11y_stars', { n: n }), 'data-stars': n });
    for (var i = 0; i < 3; i++) row.appendChild(UI.icon('star', 'star' + (i < n ? ' on' : ''), i < n));
    return row;
  }
  function stat(icon, label, val, id) {
    return h('div', { class: 'stat', 'data-id': id }, [UI.icon(icon, 'ico-sm'), h('span', { class: 'sv', text: String(val) }), h('span', { class: 'sl', text: label })]);
  }
  function showResult(info) {
    var daily = info.mode === 'daily', ov;
    G.cardShownAt = performance.now(); G.busy = false;
    var kids = [h('h2', { class: 'win-title', text: t('win_title') })];
    if (!daily) kids.push(starRow(info.stars));
    kids.push(h('div', { class: 'stats' }, [stat('clock', t('stat_time'), U.fmtTime(info.time), 'st-time'), stat('bulb', t('stat_hints'), info.hints, 'st-hints'), stat('cross', t('stat_errors'), info.errors, 'st-errors')]));
    if (!daily && info.newPiece) kids.push(h('div', { class: 'newpiece' }, [UI.icon('tiles', 'ico-sm'), h('span', { text: t('win_new_piece') })]));
    var btns = [];
    if (daily) {
      var d = S().daily;
      kids.push(h('div', { class: 'streakline' }, [UI.icon('flame', 'ico-sm flame', true), h('b', { text: String(d.streak) })]));
      kids.push(h('pre', { class: 'share-pre', dir: 'ltr', 'data-id': 'share-text', text: info.shareText }));
      btns.push(h('button', { class: 'btn primary', 'data-id': 'share', on: { click: function () { UI.shareText(info.shareText); } } }, [UI.icon('share', 'ico-sm'), document.createTextNode(' ' + t('btn_share'))]));
      btns.push(h('button', { class: 'btn', 'data-id': 'close', text: t('btn_ok'), on: { click: function () { ov.close(); UI.go('daily'); } } }));
    } else {
      var lock = function () { G.busy = true; nextB.disabled = true; retryB.disabled = true; };
      var nextB = h('button', { class: 'btn primary', 'data-id': 'next', text: t('btn_next'), on: { click: function () { if (G.busy) return; lock(); onNext(ov); } } });
      var retryB = h('button', { class: 'btn', 'data-id': 'retry', text: t('btn_retry'), on: { click: function () { if (G.busy) return; lock(); ov.close(); UI.startLevel(G.spec.level, true); } } });
      btns.push(nextB, retryB);
    }
    kids.push(h('div', { class: 'row-btns' }, btns));
    // Reklamsız teklif: yalnız küçük düğme, günde en çok bir kez (Bölüm 8.4)
    if (!daily && !MZ.Economy.adFree() && S().flags.removeAdsOfferDay !== U.todayISO()) {
      S().flags.removeAdsOfferDay = U.todayISO(); MZ.State.save();
      kids.push(h('button', { class: 'btn small link', 'data-id': 'remove-ads-card', text: t('set_remove_ads'), on: { click: function () { UI.doRemoveAds(); } } }));
    }
    ov = UI.overlay(h('div', { class: 'card result', role: 'dialog', 'aria-modal': 'true', 'data-id': 'result' }, kids), 'center');
    G.resultOv = ov;
  }
  UI.shareText = function (text) {
    var done = function () { UI.toast(t('share_copied')); };
    MZ.Share.copy(text).then(done, function () {
      var ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
    });
    if (MZ.Share.canNativeShare()) { try { MZ.Share.nativeShare(text).catch(function () {}); } catch (e) {} }
  };

  // "Sonraki": geçiş reklamı yalnız buradan sonra. Sonraki seviye reklam kapanınca açılır.
  function onNext(ov) {
    var lv = G.spec.level, nxt = MZ.Data.nextInPack(lv);
    var gone = false;
    var go = function () { if (gone) return; gone = true; ov.close(); if (nxt) UI.startLevel(nxt, false); else UI.go('packBoard', { pack: lv.pack }); };
    var online = typeof navigator === 'undefined' || navigator.onLine !== false;
    var dec = MZ.Economy.interstitialDecision(Date.now(), online, U.todayISO());
    console.log('[MZ-AD] interstitial kararı: ' + dec.show + ' (' + dec.reason + ') tamamlanan=' + S().ads.completions + ' sonraki=' + S().ads.nextAdAt);
    MZ.adLog.push({ type: 'decision', show: dec.show, reason: dec.reason, completions: S().ads.completions });
    if (!dec.show) { go(); return; }
    var wait = Math.max(0, C.ads.resultCardMinMs - (performance.now() - G.cardShownAt));
    setTimeout(function () {
      UI.fakeAd('interstitial').then(function (ok) {
        if (ok) { MZ.Economy.markInterstitialShown(Date.now()); MZ.adLog.push({ type: 'interstitial', completions: S().ads.completions }); }
        go();
      });
    }, wait);
  }
})();
