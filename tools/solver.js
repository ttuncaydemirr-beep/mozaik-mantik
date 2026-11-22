/*
 * Mozaik Mantık — ortak çözücü (Demir Games Studio)
 * Saf JS, bağımlılıksız, UMD: tarayıcıda window.MozaikSolver, Node'da module.exports.
 *
 * Kurallar: N×N ızgara, N bölge. Her satır/sütun/bölgede tam 1 taş, taşlar 8 yönde değmez.
 *
 * API (docs/00-ekip-brifi.md + aşağıdaki belgelenmiş eklemeler):
 *   parseRegions(n, regionsString)            -> number[][]
 *   findHint(n, regions, state, solution?)    -> hint | null
 *       state: n×n, 0 boş, 1 X, 2 taş.
 *       solution (OPSİYONEL, ek): satır başına taşın sütunu (levels.json "solution").
 *         Verilirse: çözümde olmayan taş ve çözüm hücresine konmuş X -> kind:"conflict", area cell.
 *         Verilmezse yalnız kurallar (V1–V4) ve mantıksal çelişki (bir birimin adayı kalmaması) yakalanır.
 *       Dönüş: { kind:"conflict"|"deduce", tech, area:{type,index}, areas:[...], place:[[r,c]],
 *                eliminate:[[r,c]], cells:[[r,c]], explainKey }
 *         - conflict'te tech = 0 (ek), explainKey "hint_conflict", cells = sorunlu taş/hücreler (ek).
 *         - areas (ek): çıkarımın dayandığı tüm birimler (T2/T3/T4 küme için birden çok); area = areas[0].
 *         - T1'de place uygulanınca eliminate = o taşın satır/sütun/bölge/komşularındaki boş hücreler.
 *         - Taş konmuş ama etkisi (otomatik X) işlenmemişse önce bu, T1 olarak döner (area cell = taş).
 *       null: tahta tamam ya da T1–T5 ile yeni çıkarım yok.
 *   solveLogic(n, regions) -> { solved, maxTech (1..5|6), steps, techCounts:[_,t1..t5] (ek) }
 *   countSolutions(n, regions, limit=2) -> number
 *   checkBoard(n, regions, state) -> { conflicts:[[r,c]], complete }
 *   (ek) canonicalKey(n, regionsString) -> döndürme/yansıma bağımsız özet (tekilleme için)
 *
 * Teknikler (kurallar 2.1):
 *   T1 tek aday; T2 bölge kilidi (bölge->satır/sütun ve satır/sütun->bölge);
 *   T3 küme k=2,3; T4 ortak komşu + küme k=4; T5 derinlik-1 çelişki: hücreye taş varsayılır,
 *   en çok 2 tur (tur = T1 sabit noktaya kadar + T2–T4'ün tek geçişte toplu uygulanması) içinde
 *   çelişki çıkarsa hücre elenir. Bunlarla çözülemeyen = T6 (reddedilir).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MozaikSolver = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function popcount(x) { x = x - ((x >>> 1) & 0x55555555); x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }
  function lowbit(x) { return 31 - Math.clz32(x & -x); }

  function parseRegions(n, s) {
    var g = [];
    for (var r = 0; r < n; r++) {
      var row = [];
      for (var c = 0; c < n; c++) row.push(s.charCodeAt(r * n + c) - 65);
      g.push(row);
    }
    return g;
  }

  // ---------- bağlam (önbellekli) ----------
  var ctxCache = {};
  function getCtx(n, regions) {
    var key = n + ':' + regions.map(function (r) { return r.join(','); }).join(';');
    var ctx = ctxCache[key];
    if (ctx) return ctx;
    var N = n * n, i, r, c;
    var reg = new Int8Array(N), rowOf = new Int8Array(N), colOf = new Int8Array(N);
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) { i = r * n + c; reg[i] = regions[r][c]; rowOf[i] = r; colOf[i] = c; }
    var unitCells = [];
    for (r = 0; r < n; r++) { var a = []; for (c = 0; c < n; c++) a.push(r * n + c); unitCells.push(a); }
    for (c = 0; c < n; c++) { var b = []; for (r = 0; r < n; r++) b.push(r * n + c); unitCells.push(b); }
    for (var k = 0; k < n; k++) unitCells.push([]);
    for (i = 0; i < N; i++) unitCells[2 * n + reg[i]].push(i);
    var cellUnits = [];
    for (i = 0; i < N; i++) cellUnits.push([rowOf[i], n + colOf[i], 2 * n + reg[i]]);
    var attackList = [], attackBits = [];
    for (i = 0; i < N; i++) {
      var lst = [], bits = new Int32Array(4);
      for (var j = 0; j < N; j++) {
        if (j === i) continue;
        var dr = Math.abs(rowOf[i] - rowOf[j]), dc = Math.abs(colOf[i] - colOf[j]);
        if (dr === 0 || dc === 0 || reg[i] === reg[j] || (dr <= 1 && dc <= 1)) { lst.push(j); bits[j >> 5] |= (1 << (j & 31)); }
      }
      attackList.push(lst); attackBits.push(bits);
    }
    // bölge kombinasyonları (k=2..4) önceden: n<=10
    ctx = { n: n, N: N, reg: reg, rowOf: rowOf, colOf: colOf, unitCells: unitCells, cellUnits: cellUnits,
      attackList: attackList, attackBits: attackBits, combos: {} };
    for (k = 2; k <= 4; k++) ctx.combos[k] = combos(n, k);
    var keys = Object.keys(ctxCache);
    if (keys.length > 64) ctxCache = {};
    ctxCache[key] = ctx;
    return ctx;
  }
  function combos(n, k) {
    var out = [];
    (function rec(start, acc) {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (var x = start; x < n; x++) { acc.push(x); rec(x + 1, acc); acc.pop(); }
    })(0, []);
    return out;
  }

  // ---------- durum yardımcıları ----------
  // st: Uint8Array, 0 aday, 1 elenmiş, 2 taş
  function place(ctx, st, i) {
    st[i] = 2;
    var a = ctx.attackList[i];
    for (var k = 0; k < a.length; k++) if (st[a[k]] === 0) st[a[k]] = 1;
  }
  function unitSolved(ctx, st, u) {
    var cells = ctx.unitCells[u];
    for (var k = 0; k < cells.length; k++) if (st[cells[k]] === 2) return true;
    return false;
  }
  function unitCands(ctx, st, u) {
    var cells = ctx.unitCells[u], out = [];
    for (var k = 0; k < cells.length; k++) if (st[cells[k]] === 0) out.push(cells[k]);
    return out;
  }
  // Satır/sütun/bölge maskeleri: lineMask[u] -> çözülmemiş birimin adaylarının satır/sütun/bölge maskeleri
  function masks(ctx, st) {
    var n = ctx.n, U = 3 * n, solved = new Uint8Array(U);
    var rowM = new Int32Array(U), colM = new Int32Array(U), regM = new Int32Array(U);
    for (var i = 0; i < ctx.N; i++) {
      var v = st[i];
      var r = ctx.rowOf[i], c = ctx.colOf[i], g = ctx.reg[i];
      if (v === 2) { solved[r] = 1; solved[n + c] = 1; solved[2 * n + g] = 1; continue; }
      if (v !== 0) continue;
      var us = ctx.cellUnits[i];
      for (var k = 0; k < 3; k++) { var u = us[k]; rowM[u] |= 1 << r; colM[u] |= 1 << c; regM[u] |= 1 << g; }
    }
    return { solved: solved, rowM: rowM, colM: colM, regM: regM };
  }

  function unitArea(n, u) {
    if (u < n) return { type: 'row', index: u };
    if (u < 2 * n) return { type: 'col', index: u - n };
    return { type: 'region', index: u - 2 * n };
  }

  // ---------- teknikler ----------
  // Her bul* fonksiyonu: null | {contra:true, units:[...]} | {tech, units:[...], place:i|-1, elim:[i..], cell:i?}
  var UNIT_ORDER_CACHE = {};
  function unitOrder(n) { // önce bölgeler, sonra satırlar, sonra sütunlar
    if (UNIT_ORDER_CACHE[n]) return UNIT_ORDER_CACHE[n];
    var o = [], k;
    for (k = 0; k < n; k++) o.push(2 * n + k);
    for (k = 0; k < n; k++) o.push(k);
    for (k = 0; k < n; k++) o.push(n + k);
    return (UNIT_ORDER_CACHE[n] = o);
  }

  function findT1(ctx, st) {
    var order = unitOrder(ctx.n);
    for (var q = 0; q < order.length; q++) {
      var u = order[q];
      if (unitSolved(ctx, st, u)) continue;
      var cs = unitCands(ctx, st, u);
      if (cs.length === 0) return { contra: true, units: [u] };
      if (cs.length === 1) {
        var i = cs[0], el = [], a = ctx.attackList[i];
        for (var k = 0; k < a.length; k++) if (st[a[k]] === 0) el.push(a[k]);
        return { tech: 1, units: [u], place: i, elim: el };
      }
    }
    return null;
  }

  // k birim (kaynak türü) adayları tam k "hedef" birime sığıyorsa, hedeflerin diğer hücreleri elenir.
  // src: 'reg'->rows, 'reg'->cols, 'row'->regs, 'col'->regs
  function findSets(ctx, st, M, kFrom, kTo, collectAll) {
    var n = ctx.n, out = collectAll ? [] : null;
    var kinds = [
      { srcBase: 2 * n, mask: M.rowM, tgtBase: 0 },
      { srcBase: 2 * n, mask: M.colM, tgtBase: n },
      { srcBase: 0, mask: M.regM, tgtBase: 2 * n },
      { srcBase: n, mask: M.regM, tgtBase: 2 * n }
    ];
    for (var k = kFrom; k <= kTo; k++) {
      var cl = ctx.combos[k];
      for (var t = 0; t < kinds.length; t++) {
        var K = kinds[t];
        for (var ci = 0; ci < cl.length; ci++) {
          var cmb = cl[ci], uni = 0, srcMask = 0, ok = true;
          for (var x = 0; x < k; x++) {
            var su = K.srcBase + cmb[x];
            if (M.solved[su]) { ok = false; break; }
            uni |= K.mask[su]; srcMask |= 1 << cmb[x];
          }
          if (!ok) continue;
          var pc = popcount(uni);
          var units = [];
          for (x = 0; x < k; x++) units.push(K.srcBase + cmb[x]);
          if (pc < k) { var cr = { contra: true, units: units }; if (collectAll) { out.push(cr); continue; } return cr; }
          if (pc !== k) continue;
          // elenecekler: hedef birimlerdeki adaylardan kaynak birimlere ait olmayanlar
          var el = [], m = uni;
          while (m) {
            var tg = lowbit(m); m &= m - 1;
            var tu = K.tgtBase + tg; units.push(tu);
            var cells = ctx.unitCells[tu];
            for (var z = 0; z < cells.length; z++) {
              var cc = cells[z];
              if (st[cc] !== 0) continue;
              var sIdx = K.srcBase === 2 * n ? ctx.reg[cc] : (K.srcBase === 0 ? ctx.rowOf[cc] : ctx.colOf[cc]);
              if (!(srcMask & (1 << sIdx))) el.push(cc);
            }
          }
          if (el.length) {
            var res = { tech: k === 1 ? 2 : (k <= 3 ? 3 : 4), units: units, place: -1, elim: el };
            if (collectAll) out.push(res); else return res;
          }
        }
      }
    }
    return out;
  }

  function findT2(ctx, st, M, collectAll) {
    var n = ctx.n, out = collectAll ? [] : null, u, el, cells, z, cc, tgt;
    // bölge -> tek satır / tek sütun
    for (var g = 0; g < n; g++) {
      u = 2 * n + g;
      if (M.solved[u]) continue;
      for (var pass = 0; pass < 2; pass++) {
        var m = pass === 0 ? M.rowM[u] : M.colM[u];
        if (popcount(m) !== 1) continue;
        tgt = (pass === 0 ? 0 : n) + lowbit(m);
        el = []; cells = ctx.unitCells[tgt];
        for (z = 0; z < cells.length; z++) { cc = cells[z]; if (st[cc] === 0 && ctx.reg[cc] !== g) el.push(cc); }
        if (el.length) { var r1 = { tech: 2, units: [u, tgt], place: -1, elim: el }; if (collectAll) out.push(r1); else return r1; }
      }
    }
    // satır/sütun -> tek bölge
    for (u = 0; u < 2 * n; u++) {
      if (M.solved[u]) continue;
      var rm = M.regM[u];
      if (popcount(rm) !== 1) continue;
      tgt = 2 * n + lowbit(rm);
      el = []; cells = ctx.unitCells[tgt];
      for (z = 0; z < cells.length; z++) {
        cc = cells[z];
        if (st[cc] !== 0) continue;
        if (u < n ? ctx.rowOf[cc] !== u : ctx.colOf[cc] !== u - n) el.push(cc);
      }
      if (el.length) { var r2 = { tech: 2, units: [u, tgt], place: -1, elim: el }; if (collectAll) out.push(r2); else return r2; }
    }
    return out;
  }

  function findCommonNeighbor(ctx, st, collectAll) {
    var n = ctx.n, order = unitOrder(n), out = collectAll ? [] : null;
    var acc = new Int32Array(4);
    for (var q = 0; q < order.length; q++) {
      var u = order[q];
      if (unitSolved(ctx, st, u)) continue;
      var cs = unitCands(ctx, st, u);
      if (cs.length < 2) continue;
      var b0 = ctx.attackBits[cs[0]];
      acc[0] = b0[0]; acc[1] = b0[1]; acc[2] = b0[2]; acc[3] = b0[3];
      for (var k = 1; k < cs.length; k++) {
        var b = ctx.attackBits[cs[k]];
        acc[0] &= b[0]; acc[1] &= b[1]; acc[2] &= b[2]; acc[3] &= b[3];
      }
      var el = [];
      for (var w = 0; w < 4; w++) {
        var m = acc[w];
        while (m) { var bt = lowbit(m); m &= m - 1; var cell = (w << 5) + bt; if (st[cell] === 0) el.push(cell); }
      }
      if (el.length) { var res = { tech: 4, units: [u], place: -1, elim: el }; if (collectAll) out.push(res); else return res; }
    }
    return out;
  }

  function findT3(ctx, st, M) { return findSets(ctx, st, M, 2, 3, false); }
  function findT4(ctx, st, M) {
    var r = findCommonNeighbor(ctx, st, false);
    if (r) return r;
    return findSets(ctx, st, M, 4, 4, false);
  }

  function hasEmptyUnit(ctx, st) {
    var U = 3 * ctx.n;
    for (var u = 0; u < U; u++) {
      var cells = ctx.unitCells[u], any = false;
      for (var k = 0; k < cells.length; k++) { var v = st[cells[k]]; if (v !== 1) { any = true; break; } }
      if (!any) return true;
    }
    return false;
  }

  // T1 sabit noktaya kadar; çelişkide true
  function t1Fix(ctx, st) {
    for (;;) {
      var d = findT1(ctx, st);
      if (!d) return false;
      if (d.contra) return true;
      place(ctx, st, d.place);
    }
  }
  // T2–T4 tek geçiş: tüm elemeleri toplayıp uygula; çelişkide true
  function bulkPass(ctx, st) {
    var M = masks(ctx, st);
    var lists = [findT2(ctx, st, M, true), findSets(ctx, st, M, 2, 4, true), findCommonNeighbor(ctx, st, true)];
    var any = false;
    for (var a = 0; a < lists.length; a++) {
      var L = lists[a];
      for (var b = 0; b < L.length; b++) {
        if (L[b].contra) return true;
        var el = L[b].elim;
        for (var k = 0; k < el.length; k++) if (st[el[k]] === 0) { st[el[k]] = 1; any = true; }
      }
    }
    return hasEmptyUnit(ctx, st);
  }
  function hypothesisFails(ctx, st, i) {
    var s = new Uint8Array(st);
    place(ctx, s, i);
    if (hasEmptyUnit(ctx, s)) return true;
    for (var round = 0; round < 2; round++) {
      if (t1Fix(ctx, s)) return true;
      if (bulkPass(ctx, s)) return true;
    }
    return false;
  }
  function findT5(ctx, st) {
    // önce adayı az birimlerdeki hücreler (oyuncu için daha doğal)
    var n = ctx.n, best = [], i;
    for (i = 0; i < ctx.N; i++) if (st[i] === 0) best.push(i);
    var score = {};
    var order = unitOrder(n);
    for (var q = 0; q < order.length; q++) {
      var cs = unitCands(ctx, st, order[q]);
      for (var k = 0; k < cs.length; k++) { var sc = score[cs[k]]; if (sc === undefined || cs.length < sc) score[cs[k]] = cs.length; }
    }
    best.sort(function (a, b) { return (score[a] - score[b]) || (a - b); });
    for (var z = 0; z < best.length; z++) {
      i = best[z];
      if (hypothesisFails(ctx, st, i)) return { tech: 5, units: [], place: -1, elim: [i], cell: i };
    }
    return null;
  }

  function nextDeduction(ctx, st, maxTech) {
    var d = findT1(ctx, st);
    if (d) return d;
    if (maxTech < 2) return null;
    var M = masks(ctx, st);
    d = findT2(ctx, st, M, false); if (d) return d;
    if (maxTech < 3) return null;
    d = findT3(ctx, st, M); if (d) return d;
    if (maxTech < 4) return null;
    d = findT4(ctx, st, M); if (d) return d;
    if (maxTech < 5) return null;
    return findT5(ctx, st);
  }

  function countStones(st) { var s = 0; for (var i = 0; i < st.length; i++) if (st[i] === 2) s++; return s; }

  function solveLogic(n, regions, opts) {
    var ctx = getCtx(n, regions);
    var maxAllowed = (opts && opts.maxTech) || 5;
    var st = new Uint8Array(ctx.N), steps = 0, maxTech = 0, tc = [0, 0, 0, 0, 0, 0];
    for (;;) {
      if (countStones(st) === n) return { solved: true, maxTech: Math.max(1, maxTech), steps: steps, techCounts: tc };
      var d = nextDeduction(ctx, st, maxAllowed);
      if (!d || d.contra) return { solved: false, maxTech: 6, steps: steps, techCounts: tc };
      if (d.place >= 0) place(ctx, st, d.place);
      for (var k = 0; k < d.elim.length; k++) if (st[d.elim[k]] === 0) st[d.elim[k]] = 1;
      steps++; tc[d.tech]++;
      if (d.tech > maxTech) maxTech = d.tech;
    }
  }

  // ---------- çözüm sayma ----------
  function countSolutions(n, regions, limit) {
    if (limit === undefined) limit = 2;
    var ctx = getCtx(n, regions);
    var regRows = new Int32Array(n); // bölgenin bulunduğu satırların maskesi
    for (var i = 0; i < ctx.N; i++) regRows[ctx.reg[i]] |= 1 << ctx.rowOf[i];
    var count = 0, full = (1 << n) - 1;
    function rec(r, colUsed, regUsed, prevC) {
      if (r === n) { count++; return; }
      // ileri kontrol: kullanılmamış her bölge kalan satırlarda olmalı
      var rest = full & ~((1 << r) - 1);
      for (var g = 0; g < n; g++) if (!(regUsed & (1 << g)) && !(regRows[g] & rest)) return;
      for (var c = 0; c < n; c++) {
        if (colUsed & (1 << c)) continue;
        if (prevC >= 0 && Math.abs(c - prevC) < 2) continue;
        var g2 = ctx.reg[r * n + c];
        if (regUsed & (1 << g2)) continue;
        rec(r + 1, colUsed | (1 << c), regUsed | (1 << g2), c);
        if (count >= limit) return;
      }
    }
    rec(0, 0, 0, -1);
    return count;
  }

  // ---------- tahta kontrolü ----------
  function checkBoard(n, regions, state) {
    var stones = [], r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (state[r][c] === 2) stones.push([r, c]);
    var bad = {};
    for (var a = 0; a < stones.length; a++) for (var b = a + 1; b < stones.length; b++) {
      var p = stones[a], q = stones[b];
      if (p[0] === q[0] || p[1] === q[1] || regions[p[0]][p[1]] === regions[q[0]][q[1]] ||
          (Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)) { bad[a] = 1; bad[b] = 1; }
    }
    var conflicts = [];
    for (a = 0; a < stones.length; a++) if (bad[a]) conflicts.push(stones[a]);
    return { conflicts: conflicts, complete: conflicts.length === 0 && stones.length === n };
  }

  function conflictArea(n, regions, p, q) {
    if (p[0] === q[0]) return { type: 'row', index: p[0] };
    if (p[1] === q[1]) return { type: 'col', index: p[1] };
    if (regions[p[0]][p[1]] === regions[q[0]][q[1]]) return { type: 'region', index: regions[p[0]][p[1]] };
    return { type: 'cell', index: [p[0], p[1]] };
  }

  function rc(ctx, i) { return [ctx.rowOf[i], ctx.colOf[i]]; }

  // ---------- ipucu ----------
  function findHint(n, regions, state, solution) {
    var ctx = getCtx(n, regions), r, c, i, k;
    // 1) kural çakışması
    var stones = [];
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (state[r][c] === 2) stones.push([r, c]);
    for (var a = 0; a < stones.length; a++) for (var b = a + 1; b < stones.length; b++) {
      var p = stones[a], q = stones[b];
      if (p[0] === q[0] || p[1] === q[1] || regions[p[0]][p[1]] === regions[q[0]][q[1]] ||
          (Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)) {
        var ar = conflictArea(n, regions, p, q);
        return { kind: 'conflict', tech: 0, area: ar, areas: [ar], place: [], eliminate: [], cells: [p, q], explainKey: 'hint_conflict' };
      }
    }
    // 2) çözüme göre (opsiyonel)
    if (solution) {
      for (k = 0; k < stones.length; k++) {
        if (solution[stones[k][0]] !== stones[k][1]) {
          var a1 = { type: 'cell', index: stones[k] };
          return { kind: 'conflict', tech: 0, area: a1, areas: [a1], place: [], eliminate: [], cells: [stones[k]], explainKey: 'hint_conflict' };
        }
      }
      for (r = 0; r < n; r++) if (state[r][solution[r]] === 1) {
        var a2 = { type: 'cell', index: [r, solution[r]] };
        return { kind: 'conflict', tech: 0, area: a2, areas: [a2], place: [], eliminate: [], cells: [[r, solution[r]]], explainKey: 'hint_conflict' };
      }
    }
    // 3) taşların işlenmemiş etkisi (otomatik X kapalıysa)
    var st = new Uint8Array(ctx.N);
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) st[r * n + c] = state[r][c] === 2 ? 2 : (state[r][c] === 1 ? 1 : 0);
    if (stones.length === n) return null;
    for (k = 0; k < stones.length; k++) {
      i = stones[k][0] * n + stones[k][1];
      var el = [], at = ctx.attackList[i];
      for (var z = 0; z < at.length; z++) if (st[at[z]] === 0) el.push(rc(ctx, at[z]));
      if (el.length) {
        var a3 = { type: 'cell', index: stones[k] };
        return { kind: 'deduce', tech: 1, area: a3, areas: [a3], place: [], eliminate: el, cells: [stones[k]], explainKey: 'hint_t1' };
      }
    }
    // 4) mantık
    var d = nextDeduction(ctx, st, 5);
    if (!d) return null;
    if (d.contra) {
      var areasC = d.units.map(function (u) { return unitArea(n, u); });
      return { kind: 'conflict', tech: 0, area: areasC[0], areas: areasC, place: [], eliminate: [], cells: [], explainKey: 'hint_conflict' };
    }
    var areas = d.tech === 5 ? [{ type: 'cell', index: rc(ctx, d.cell) }] : d.units.map(function (u) { return unitArea(n, u); });
    return {
      kind: 'deduce', tech: d.tech, area: areas[0], areas: areas,
      place: d.place >= 0 ? [rc(ctx, d.place)] : [],
      eliminate: d.elim.map(function (x) { return rc(ctx, x); }),
      cells: [], explainKey: 'hint_t' + d.tech
    };
  }

  // ---------- tekilleme özeti ----------
  function canonicalKey(n, s) {
    var best = null;
    for (var t = 0; t < 8; t++) {
      var map = {}, next = 0, out = '';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        var rr = r, cc = c, x;
        if (t & 4) { x = rr; rr = cc; cc = x; }
        if (t & 1) rr = n - 1 - rr;
        if (t & 2) cc = n - 1 - cc;
        var ch = s[rr * n + cc];
        if (map[ch] === undefined) map[ch] = String.fromCharCode(65 + next++);
        out += map[ch];
      }
      if (best === null || out < best) best = out;
    }
    return n + ':' + best;
  }

  return {
    parseRegions: parseRegions,
    findHint: findHint,
    solveLogic: solveLogic,
    countSolutions: countSolutions,
    checkBoard: checkBoard,
    canonicalKey: canonicalKey
  };
});
