/* Oyun mantığı (DOM'suz, Flutter'a taşınacak): tahta durumu, dokunma döngüsü, sürükleme,
   otomatik X, geri al/ileri al, çakışma, ipucu uygulama, seri/yıldız hesabı.
   Hücre durumları: 0 boş, 1 X (elle), 2 taş, 3 otomatik X. Çözücüye giderken 3 -> 1. */
(function () {
  var MZ = window.MZ = window.MZ || {};
  var EMPTY = 0, X = 1, STONE = 2, AUTO = 3;

  function Game(opts) {
    this.n = opts.n; this.regionsStr = opts.regions; this.solution = opts.solution || null;
    this.rg = MZ.Solver.parseRegions(this.n, this.regionsStr);
    this.cells = new Uint8Array(this.n * this.n);
    this.undoStack = []; this.redoStack = [];
    this.log = [];                 // konulan taşlar, sırayla: {i, h:ipucu, x:çakışma yarattı}
    this.hints = 0; this.errors = 0; this.elapsed = 0;
    this.won = false;
    this.settings = opts.settings || { autoX: true, quickStone: false };
    this.mode = opts.mode || 'level';   // level | daily | tutorial
    this._drag = null; this._chk = null;
    this.hint = null;              // {stage:1|2, h, sig}: açık ipucu
    this.paidSig = null;           // parası ödenmiş son ipucunun imzası (aynıysa yeniden ücret yok)
    this.tutFirst = opts.tutFirst == null ? null : opts.tutFirst;   // öğretici: ilk hedef hücre indeksi
  }
  var P = Game.prototype;

  P.idx = function (r, c) { return r * this.n + c; };
  P.rc = function (i) { return [Math.floor(i / this.n), i % this.n]; };
  P.regionAt = function (i) { var n = this.n; return this.rg[Math.floor(i / n)][i % n]; };
  P.stateGrid = function () {
    var n = this.n, g = [], r, c, v;
    for (r = 0; r < n; r++) { g[r] = []; for (c = 0; c < n; c++) { v = this.cells[r * n + c]; g[r][c] = v === AUTO ? X : v; } }
    return g;
  };
  P.stones = function () { var o = []; for (var i = 0; i < this.cells.length; i++) if (this.cells[i] === STONE) o.push(i); return o; };
  P.attacks = function (a, b) {          // a, b: hücre indeksleri (K1–K4)
    if (a === b) return false;
    var n = this.n, ar = Math.floor(a / n), ac = a % n, br = Math.floor(b / n), bc = b % n;
    return ar === br || ac === bc || this.regionAt(a) === this.regionAt(b) || Math.max(Math.abs(ar - br), Math.abs(ac - bc)) < 2;
  };
  P.attackedCells = function (i) { var o = []; for (var j = 0; j < this.cells.length; j++) if (this.attacks(i, j)) o.push(j); return o; };
  P.check = function () {
    if (!this._chk) this._chk = MZ.Solver.checkBoard(this.n, this.rg, this.stateGrid());
    return this._chk;
  };
  P.conflictSet = function () {
    var s = {}, n = this.n; this.check().conflicts.forEach(function (p) { s[p[0] * n + p[1]] = 1; }); return s;
  };
  P.isComplete = function () { return !!this.check().complete; };
  // Çakışmanın nedeni olan alanlar (parlatma için)
  P.reasonsFor = function (i) {
    var out = [], n = this.n, r = Math.floor(i / n), c = i % n, self = this, seen = {};
    this.stones().forEach(function (j) {
      if (j === i) return;
      var jr = Math.floor(j / n), jc = j % n, add = function (t, ix) { var k = t + ix; if (!seen[k]) { seen[k] = 1; out.push({ type: t, index: ix }); } };
      if (jr === r) add('row', r);
      if (jc === c) add('col', c);
      if (self.regionAt(j) === self.regionAt(i)) add('region', self.regionAt(i));
      if (Math.max(Math.abs(jr - r), Math.abs(jc - c)) < 2) add('nbr', i);
    });
    return out;
  };
  P.areaCells = function (area) {
    var n = this.n, o = [], r, c;
    if (!area) return o;
    if (area.type === 'cell') return [area.index[0] * n + area.index[1]];
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
      if ((area.type === 'row' && r === area.index) || (area.type === 'col' && c === area.index) || (area.type === 'region' && this.rg[r][c] === area.index)) o.push(r * n + c);
    }
    return o;
  };

  // --- Geçmiş
  P._snap = function () { return { c: new Uint8Array(this.cells), l: this.log.map(function (e) { return { i: e.i, h: e.h, x: e.x }; }) }; };
  P._restore = function (s) { this.cells = new Uint8Array(s.c); this.log = s.l.map(function (e) { return { i: e.i, h: e.h, x: e.x }; }); this._chk = null; };
  P._commit = function (before) {
    var same = true, i;
    for (i = 0; i < this.cells.length; i++) if (before.c[i] !== this.cells[i]) { same = false; break; }
    if (same) return false;
    this.undoStack.push(before); this.redoStack = []; this._chk = null; this.revalidateHint(); return true;
  };
  P.undo = function () {
    if (!this.undoStack.length || this.won) return false;
    this.redoStack.push(this._snap()); this._restore(this.undoStack.pop()); this.revalidateHint(); return true;
  };
  P.redo = function () {
    if (!this.redoStack.length || this.won) return false;
    this.undoStack.push(this._snap()); this._restore(this.redoStack.pop()); this.revalidateHint(); return true;
  };
  P.canUndo = function () { return this.undoStack.length > 0 && !this.won; };
  P.canRedo = function () { return this.redoStack.length > 0 && !this.won; };

  // --- Hücre yazma (tek nokta): taş koyma/kaldırma yan etkileri burada
  P._set = function (i, v, flags) {
    var old = this.cells[i], k;
    if (old === v) return;
    this.cells[i] = v; this._chk = null;
    if (old === STONE) {
      this.log = this.log.filter(function (e) { return e.i !== i; });
      this._recomputeAuto();
    }
    if (v === STONE) {
      var entry = { i: i, h: !!(flags && flags.hint), x: false };
      this.log.push(entry);
      if (this.settings.autoX) {
        var att = this.attackedCells(i);
        for (k = 0; k < att.length; k++) if (this.cells[att[k]] === EMPTY) this.cells[att[k]] = AUTO;
      }
      // Hata sayımı: bu taş V1–V4'ten birini ihlal ediyorsa (çözümle karşılaştırma yok)
      var chk = this.check(), r = Math.floor(i / this.n), c = i % this.n, bad = false;
      for (k = 0; k < chk.conflicts.length; k++) if (chk.conflicts[k][0] === r && chk.conflicts[k][1] === c) bad = true;
      if (!bad && this.reasonsFor(i).length) bad = true;
      if (bad) { entry.x = true; if (!(flags && flags.noCount)) this.errors++; this._lastBad = i; }
    }
  };
  P._recomputeAuto = function () {
    var st = this.stones(), i, j, keep;
    for (i = 0; i < this.cells.length; i++) if (this.cells[i] === AUTO) {
      keep = false;
      for (j = 0; j < st.length; j++) if (this.attacks(st[j], i)) { keep = true; break; }
      if (!keep) this.cells[i] = EMPTY;
    }
  };

  // --- Dokunma
  P.nextTutorialTarget = function () {
    if (this.tutFirst != null && this.cells[this.tutFirst] !== STONE && !this.stones().length) return this.tutFirst;
    if (!this.solution) return null;
    for (var r = 0; r < this.n; r++) { var i = r * this.n + this.solution[r]; if (this.cells[i] !== STONE) return i; }
    return null;
  };
  // Dönüş: {changed, placed, bad, areas, guided}
  P.tap = function (r, c) {
    var i = this.idx(r, c), res = { changed: false, placed: false, bad: false, areas: [], guided: false };
    if (this.won) return res;
    if (this.mode === 'tutorial') {
      var tg = this.nextTutorialTarget();
      if (i !== tg) { res.guided = true; return res; }       // sessiz yönlendirme
      var b0 = this._snap(); this._set(i, STONE, { noCount: true });
      res.changed = this._commit(b0); res.placed = true; return res;
    }
    var before = this._snap(), v = this.cells[i], nv;
    if (this.settings.quickStone) nv = v === EMPTY ? STONE : v === STONE ? X : EMPTY;     // boş→taş→X→boş
    else nv = (v === EMPTY) ? X : (v === X || v === AUTO) ? STONE : EMPTY;                  // boş→X→taş→boş
    this._lastBad = -1; this._set(i, nv);
    res.changed = this._commit(before);
    if (nv === STONE) { res.placed = true; if (this._lastBad === i) { res.bad = true; res.areas = this.reasonsFor(i); } }
    return res;
  };
  P.longPress = function (r, c) {
    var i = this.idx(r, c), res = { changed: false, placed: false, bad: false, areas: [] };
    if (this.won || this.mode === 'tutorial') return res;
    var before = this._snap(); this._lastBad = -1;
    this._set(i, this.cells[i] === STONE ? EMPTY : STONE);
    res.changed = this._commit(before);
    if (this.cells[i] === STONE) { res.placed = true; if (this._lastBad === i) { res.bad = true; res.areas = this.reasonsFor(i); } }
    return res;
  };
  // --- Sürükleme (tek geri al adımı; taşa dokunmaz)
  P.dragBegin = function (r, c) {
    if (this.won || this.mode === 'tutorial') return null;
    var v = this.cells[this.idx(r, c)], mode = v === EMPTY ? 'add' : (v === X || v === AUTO) ? 'erase' : null;
    this._drag = { mode: mode, before: this._snap() };
    return mode;
  };
  P.dragOver = function (r, c) {
    var d = this._drag; if (!d || !d.mode) return false;
    var i = this.idx(r, c), v = this.cells[i];
    if (d.mode === 'add' && v === EMPTY) { this.cells[i] = X; this._chk = null; return true; }
    if (d.mode === 'erase' && (v === X || v === AUTO)) { this.cells[i] = EMPTY; this._chk = null; return true; }
    return false;
  };
  P.dragEnd = function () {
    var d = this._drag; this._drag = null; if (!d || !d.mode) return false;
    return this._commit(d.before);
  };
  // --- İpucu
  P.getHint = function () { return MZ.Solver.findHint(this.n, this.rg, this.stateGrid(), this.solution || undefined); };   // solution verilir: çözümde olmayan taş/X da conflict
  // Aşama 3: çıkarımı tahtaya işle (tek geri al adımı)
  P.applyHint = function (h) {
    var before = this._snap(), n = this.n, self = this;
    if (h.kind === 'conflict') {
      var target = this._conflictTarget(h);
      if (target != null) this._set(target, EMPTY);
    } else {
      (h.eliminate || []).forEach(function (p) { var i = p[0] * n + p[1]; if (self.cells[i] === EMPTY) { self.cells[i] = X; } });
      (h.place || []).forEach(function (p) { self._set(p[0] * n + p[1], STONE, { hint: true, noCount: true }); });
    }
    this._chk = null;
    return this._commit(before);
  };
  // Çakışma ipucunda kaldırılacak hücre: çözümde OLMAYAN taş ya da çözüm hücresindeki X; yoksa ilk sorunlu hücre
  P._conflictTarget = function (h) {
    var n = this.n, self = this, cells = (h.cells && h.cells.length) ? h.cells.map(function (p) { return p[0] * n + p[1]; }) : [];
    if (!cells.length && h.area && h.area.type === 'cell') cells = [h.area.index[0] * n + h.area.index[1]];
    if (!cells.length) cells = this.check().conflicts.map(function (p) { return p[0] * n + p[1]; });
    if (this.solution) {
      var wrong = cells.filter(function (i) { var r = Math.floor(i / n), c = i % n; return self.cells[i] === STONE && self.solution[r] !== c; });
      if (wrong.length) return wrong[0];
      var wx = cells.filter(function (i) { var r = Math.floor(i / n), c = i % n; return (self.cells[i] === X || self.cells[i] === AUTO) && self.solution[r] === c; });
      if (wx.length) return wx[0];
      // sorunlu hücreler arasında çözümde olmayan herhangi bir taş (conflict listesi doğru taşı da içerebilir)
      var st = this.stones().filter(function (i) { return self.solution[Math.floor(i / n)] !== i % n; });
      var inCells = st.filter(function (i) { return cells.indexOf(i) >= 0; });
      if (inCells.length) return inCells[0];
      if (st.length) return st[0];
    }
    return cells.length ? cells[0] : null;
  };
  // --- İpucu akışı (iş kuralı: aşama maliyetleri 1 / 0 / 1, tam ipucu 2 hak)
  function sigOf(h) { return JSON.stringify([h.kind, h.area, h.place, h.eliminate]); }
  P.revalidateHint = function () {
    if (!this.hint) return;
    var h = this.getHint();
    if (!h || sigOf(h) !== this.hint.sig) this.hint = null; else this.hint.h = h;   // oyuncunun hamlesi ipucunu geçersiz kılmadıysa açık kalır
  };
  P.hintStage = function () { return this.hint ? this.hint.stage : 0; };
  // Sıradaki basışın maliyeti (hak)
  P.hintNextCost = function () {
    if (this.hint) return this.hint.stage === 1 ? 0 : 1;
    if (this.paidSig) { var h = this.getHint(); if (h && sigOf(h) === this.paidSig) return 0; }
    return 1;
  };
  // economy: {canAfford(n), spend(n)}. Dönüş: {status: none|nothing|need-ad|stage1|stage2|applied, changed}
  P.hintPress = function (eco) {
    if (this.won || this.mode === 'tutorial') return { status: 'none' };
    var cost = this.hintNextCost();
    if (!this.hint) {
      var h = this.getHint();
      if (!h) return { status: 'nothing' };
      if (cost > 0) { if (!eco.canAfford(cost)) return { status: 'need-ad' }; eco.spend(cost); this.hints++; this.paidSig = sigOf(h); }
      this.hint = { stage: 1, h: h, sig: sigOf(h) }; return { status: 'stage1' };
    }
    if (this.hint.stage === 1) { this.hint.stage = 2; return { status: 'stage2' }; }
    if (!eco.canAfford(1)) return { status: 'need-ad' };
    eco.spend(1);
    var hh = this.hint.h; this.hint = null; this.paidSig = null;
    return { status: 'applied', changed: this.applyHint(hh) };
  };
  P.dragCancel = function () {
    var d = this._drag; this._drag = null;
    if (d && d.before) { this.cells = new Uint8Array(d.before.c); this._chk = null; }
  };
  // --- Kayıt
  P.serialize = function () {
    function enc(c) { var s = ''; for (var i = 0; i < c.length; i++) s += c[i]; return s; }
    return { c: enc(this.cells), l: this.log, u: this.undoStack.map(function (s) { return { c: enc(s.c), l: s.l }; }),
             r: this.redoStack.map(function (s) { return { c: enc(s.c), l: s.l }; }),
             e: Math.round(this.elapsed), h: this.hints, x: this.errors };
  };
  P.restore = function (o) {
    var n2 = this.n * this.n;
    function dec(s) {
      if (typeof s !== 'string' || s.length !== n2) throw new Error('bad-save');
      var a = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) { a[i] = +s[i]; if (!(a[i] >= 0 && a[i] <= 3)) throw new Error('bad-save'); }
      return a;
    }
    function log(l) { if (!Array.isArray(l)) return []; return l.filter(function (e) { return e && typeof e.i === 'number' && e.i >= 0 && e.i < n2; }).map(function (e) { return { i: e.i, h: !!e.h, x: !!e.x }; }); }
    if (!o || typeof o !== 'object') throw new Error('bad-save');
    var cells = dec(o.c), lg = log(o.l);
    var u = (Array.isArray(o.u) ? o.u : []).map(function (s) { return { c: dec(s.c), l: log(s.l) }; });
    var r = (Array.isArray(o.r) ? o.r : []).map(function (s) { return { c: dec(s.c), l: log(s.l) }; });
    this.cells = cells; this.log = lg; this.undoStack = u; this.redoStack = r;
    this.elapsed = +o.e > 0 ? +o.e : 0; this.hints = +o.h > 0 ? +o.h : 0; this.errors = +o.x > 0 ? +o.x : 0; this._chk = null;
  };
  P.strip = function () { return this.log.map(function (e) { return e.h ? 'h' : e.x ? 'x' : 'c'; }); };

  MZ.Logic = {
    Game: Game, EMPTY: EMPTY, X: X, STONE: STONE, AUTO: AUTO,
    // Bölüm 3.6 yıldız ölçütü (süre etkilemez)
    stars: function (hints, errors) { return (hints === 0 && errors === 0) ? 3 : (hints <= 1 && errors <= 2) ? 2 : 1; }
  };
})();
