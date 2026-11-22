#!/usr/bin/env node
// Mozaik Mantık — veri ve çözücü testleri.  Çalıştır: node tools/test.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const S = require('./solver.js');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; if (failures.length < 50) failures.push(msg); } }

const dataDir = path.join(__dirname, '..', 'data');
const levels = JSON.parse(fs.readFileSync(path.join(dataDir, 'levels.json'), 'utf8')).levels;
const daily = JSON.parse(fs.readFileSync(path.join(dataDir, 'daily.json'), 'utf8')).puzzles;
const tutorial = JSON.parse(fs.readFileSync(path.join(dataDir, 'tutorial.json'), 'utf8')).levels;

const PACK = {
  cirak: { n: [5, 6], tech: 1, min: 1, count: 50 },
  kalfa: { n: [7], tech: 2, min: 1, count: 60 },
  usta: { n: [8], tech: 3, min: 1, count: 70 },
  basusta: { n: [9], tech: 4, min: 2, count: 70 },
  nakkas: { n: [10], tech: 5, min: 1, count: 50 }
};

const emptyState = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const solState = (L) => { const s = emptyState(L.n); L.solution.forEach((c, r) => { s[r][c] = 2; }); return s; };

function contiguous(n, g, grid) {
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c] === g) cells.push([r, c]);
  if (!cells.length) return false;
  const seen = new Set([cells[0].join()]), st = [cells[0]];
  while (st.length) {
    const [r, c] = st.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc, k = rr + ',' + cc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && grid[rr][cc] === g && !seen.has(k)) { seen.add(k); st.push([rr, cc]); }
    }
  }
  return seen.size === cells.length;
}

// Bir seviye için tüm yapısal + çözücü testleri
function checkLevel(L, opt) {
  const tag = L.id;
  const n = L.n;
  ok(typeof L.regions === 'string' && L.regions.length === n * n, tag + ': regions uzunluğu');
  const grid = S.parseRegions(n, L.regions);
  const labels = new Set(L.regions.split(''));
  ok(labels.size === n, tag + ': bölge sayısı = n');
  let labelsOk = true;
  for (const ch of labels) { const g = ch.charCodeAt(0) - 65; if (g < 0 || g >= n) labelsOk = false; }
  ok(labelsOk, tag + ': bölge harfleri A..');
  let contig = true;
  for (let g = 0; g < n; g++) if (!contiguous(n, g, grid)) contig = false;
  ok(contig, tag + ': bölgeler bitişik');
  // tasarım kısıtları
  const sizes = new Array(n).fill(0); for (const row of grid) for (const g of row) sizes[g]++;
  const singles = sizes.filter((x) => x < 2).length;
  ok(singles <= (opt.allowSingleton ? 1 : 0), tag + ': tek hücrelik bölge sınırı');
  if (!opt.tutorial) ok(Math.max(...sizes) <= Math.floor(n * n * 0.3), tag + ': en büyük bölge ≤ %30');
  let fullLine = false;
  for (let i = 0; i < n; i++) {
    if (grid[i].every((g) => g === grid[i][0])) fullLine = true;
    if (grid.every((row) => row[i] === grid[0][i])) fullLine = true;
  }
  ok(!fullLine, tag + ': hiçbir bölge tam satır/sütun değil');
  // V1–V4
  ok(Array.isArray(L.solution) && L.solution.length === n, tag + ': solution uzunluğu');
  const cb = S.checkBoard(n, grid, solState(L));
  ok(cb.complete && cb.conflicts.length === 0, tag + ': gömülü çözüm V1–V4');
  // tek çözüm
  ok(S.countSolutions(n, grid, 2) === 1, tag + ': countSolutions == 1');
  // mantık çözücü
  const res = S.solveLogic(n, grid);
  ok(res.solved && res.maxTech <= 5, tag + ': T1–T5 ile çözülür (T6 yok)');
  ok(res.maxTech === L.tech, tag + ': tech kaydı = solveLogic (' + res.maxTech + ' / ' + L.tech + ')');
  ok(res.steps === L.steps, tag + ': steps kaydı = solveLogic');
  if (opt.pack) {
    const P = PACK[L.pack];
    ok(!!P, tag + ': geçerli paket');
    if (P) {
      ok(P.n.includes(n), tag + ': paket boyutu');
      ok(L.tech === P.tech, tag + ': paket tech');
      ok(res.techCounts[P.tech] >= P.min, tag + ': en az ' + P.min + ' adım T' + P.tech);
    }
  }
  // ipuçlarını art arda uygula -> bitmeli; her ipucu çözümle tutarlı olmalı
  const state = emptyState(n);
  let guard = 0, hintMax = 0, sound = true, first = true;
  for (;;) {
    const h = S.findHint(n, grid, state, L.solution);
    if (first) { ok(h && h.kind === 'deduce' && (h.place.length || h.eliminate.length), tag + ': boş tahtada ilk ipucu'); first = false; }
    if (!h) break;
    if (h.kind !== 'deduce') { sound = false; break; }
    hintMax = Math.max(hintMax, h.tech);
    for (const [r, c] of h.place) { if (L.solution[r] !== c) sound = false; state[r][c] = 2; }
    for (const [r, c] of h.eliminate) { if (L.solution[r] === c) sound = false; state[r][c] = 1; }
    if (!sound || ++guard > 500) break;
  }
  ok(sound, tag + ': ipuçları çözümle tutarlı');
  ok(S.checkBoard(n, grid, state).complete, tag + ': ipuçlarıyla bulmaca biter');
  ok(hintMax <= L.tech, tag + ': ipucu tekniği ≤ tech');
  ok(S.findHint(n, grid, state, L.solution) === null, tag + ': bitmiş tahtada ipucu null');
  return grid;
}

// ---------- seviyeler ----------
console.log('levels.json: ' + levels.length + ' seviye');
ok(levels.length === 300, 'levels: 300 seviye');
const ids = new Set();
const keys = new Map();
function dedupe(L) {
  const k = S.canonicalKey(L.n, L.regions);
  ok(!keys.has(k), L.id + ': tekrar yok (döndürme/yansıma dahil) — ' + (keys.get(k) || ''));
  keys.set(k, L.id);
  ok(!ids.has(L.id), L.id + ': id tekil');
  ids.add(L.id);
}
const byPack = {};
for (const L of levels) {
  checkLevel(L, { pack: true, allowSingleton: L.pack === 'cirak' });
  dedupe(L);
  (byPack[L.pack] = byPack[L.pack] || []).push(L);
}
for (const p of Object.keys(PACK)) {
  const arr = byPack[p] || [];
  ok(arr.length === PACK[p].count, p + ': seviye sayısı ' + PACK[p].count);
  let sorted = true;
  for (let i = 1; i < arr.length; i++) {
    const a = arr[i - 1], b = arr[i];
    if (a.tech > b.tech || (a.tech === b.tech && a.steps > b.steps)) sorted = false;
  }
  ok(sorted, p + ': paket içinde (tech, steps) artan');
  arr.forEach((L, i) => ok(L.id === p[0] + '-' + String(i + 1).padStart(3, '0'), L.id + ': id biçimi/sırası'));
}
ok((byPack.cirak || []).filter((L) => L.n === 5).length === 15, 'cirak: 15 adet 5×5');

// ---------- günlük ----------
console.log('daily.json: ' + daily.length + ' bulmaca');
ok(daily.length === 400, 'daily: 400 bulmaca');
const WEEK = ['cirak', 'kalfa', 'usta', 'usta', 'basusta', 'basusta', 'nakkas'];
daily.forEach((L, d) => {
  ok(L.id === 'd-' + String(d + 1).padStart(4, '0'), L.id + ': sıralı id');
  ok(L.pack === WEEK[d % 7], L.id + ': haftanın günü zorluğu');
  checkLevel(L, { pack: true, allowSingleton: L.pack === 'cirak' });
  dedupe(L);
});

// ---------- öğretici ----------
console.log('tutorial.json: ' + tutorial.length + ' seviye');
ok(tutorial.length === 3, 'tutorial: 3 seviye');
ok(tutorial.map((t) => t.n).join() === '4,5,6', 'tutorial: 4×4, 5×5, 6×6');
tutorial.forEach((L, i) => {
  const grid = checkLevel(L, { allowSingleton: i < 2, tutorial: true });
  dedupe(L);
  if (i < 2) {
    ok(L.tech === 1, L.id + ': yalnız T1');
    const h = S.findHint(L.n, grid, emptyState(L.n));
    ok(h.tech === 1 && h.area.type === 'region' && h.place.length === 1, L.id + ': ilk adım tek hücrelik bölge');
  } else {
    ok(L.tech === 2, L.id + ': T2 öğretir');
    const h = S.findHint(L.n, grid, emptyState(L.n));
    ok(h.tech === 2 && h.areas[0].type === 'region' && h.areas[1].type === 'row', L.id + ': ilk adım bölge kilidi (bölge -> satır)');
  }
});

// ---------- findHint birim testleri ----------
{
  const L = levels.find((x) => x.n === 7);
  const n = L.n, grid = S.parseRegions(n, L.regions);
  // yanlış taş (kurala uygun ama çözümde yok) + çözüm verilirse -> conflict
  let wr = 0, wc = (L.solution[0] + 3) % n;
  const st = emptyState(n); st[wr][wc] = 2;
  let h = S.findHint(n, grid, st, L.solution);
  ok(h && h.kind === 'conflict' && h.area.type === 'cell' && h.area.index[0] === wr && h.area.index[1] === wc && h.explainKey === 'hint_conflict', 'findHint: yanlış taş -> conflict (solution ile)');
  // iki taş çapraz komşu -> conflict (çözümsüz de)
  const st2 = emptyState(n); st2[2][2] = 2; st2[3][3] = 2;
  h = S.findHint(n, grid, st2);
  ok(h && h.kind === 'conflict' && h.cells.length === 2, 'findHint: değen taşlar -> conflict');
  // aynı satırda iki taş
  const st3 = emptyState(n); st3[1][0] = 2; st3[1][4] = 2;
  h = S.findHint(n, grid, st3);
  ok(h && h.kind === 'conflict' && h.area.type === 'row' && h.area.index === 1, 'findHint: aynı satır -> conflict area row');
  // çözüm hücresine X -> conflict
  const st4 = emptyState(n); st4[4][L.solution[4]] = 1;
  h = S.findHint(n, grid, st4, L.solution);
  ok(h && h.kind === 'conflict' && h.area.type === 'cell' && h.area.index[0] === 4 && h.area.index[1] === L.solution[4], 'findHint: çözüme X -> conflict');
  // çözümsüz: bir bölgenin tüm hücreleri X -> conflict (mantıksal çelişki)
  const st5 = emptyState(n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c] === 0) st5[r][c] = 1;
  h = S.findHint(n, grid, st5);
  ok(h && h.kind === 'conflict', 'findHint: bölge tamamen X -> conflict (solution olmadan)');
  // önce çakışma: hem yanlış taş hem çakışma varken conflict döner
  // taş kondu ama otomatik X yok -> T1 eleme ipucu
  const st6 = emptyState(n); st6[0][L.solution[0]] = 2;
  h = S.findHint(n, grid, st6, L.solution);
  ok(h && h.kind === 'deduce' && h.tech === 1 && h.place.length === 0 && h.eliminate.length > 0, 'findHint: işlenmemiş taş etkisi -> T1 eleme');
  // boş tahta: ilk ipucu en kolay teknik (çözücünün ilk adımıyla aynı teknik)
  h = S.findHint(n, grid, emptyState(n));
  ok(h && h.kind === 'deduce' && h.tech >= 1 && h.tech <= 5 && /^hint_t[1-5]$/.test(h.explainKey), 'findHint: boş tahta ilk ipucu');
  // çakışma yoksa ve tahta bitmişse null
  ok(S.findHint(n, grid, solState(L)) === null, 'findHint: bitmiş tahta null');
}

// ---------- checkBoard birim testleri ----------
{
  const L = levels[0], n = L.n, grid = S.parseRegions(n, L.regions);
  let r = S.checkBoard(n, grid, emptyState(n));
  ok(r.conflicts.length === 0 && !r.complete, 'checkBoard: boş tahta');
  r = S.checkBoard(n, grid, solState(L));
  ok(r.conflicts.length === 0 && r.complete, 'checkBoard: çözüm tamam');
  const s1 = emptyState(n); s1[0][0] = 2; s1[1][1] = 2;
  r = S.checkBoard(n, grid, s1);
  ok(r.conflicts.length === 2 && !r.complete, 'checkBoard: çapraz değme');
  const s2 = emptyState(n); s2[0][0] = 2; s2[4][0] = 2;
  r = S.checkBoard(n, grid, s2);
  ok(r.conflicts.length === 2, 'checkBoard: aynı sütun');
  // aynı bölge, değmeyen iki taş
  let found = false;
  outer: for (let a = 0; a < n * n; a++) for (let b = a + 1; b < n * n; b++) {
    const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
    if (ar !== br && ac !== bc && Math.max(Math.abs(ar - br), Math.abs(ac - bc)) >= 2 && grid[ar][ac] === grid[br][bc]) {
      const s3 = emptyState(n); s3[ar][ac] = 2; s3[br][bc] = 2;
      r = S.checkBoard(n, grid, s3);
      ok(r.conflicts.length === 2, 'checkBoard: aynı bölge');
      found = true; break outer;
    }
  }
  ok(found, 'checkBoard: aynı bölge testi kurulabildi');
  const s4 = solState(L); s4[0][L.solution[0]] = 0;
  r = S.checkBoard(n, grid, s4);
  ok(r.conflicts.length === 0 && !r.complete, 'checkBoard: eksik taş tamam değil');
}

// ---------- UMD (tarayıcı) ----------
{
  const code = fs.readFileSync(path.join(__dirname, 'solver.js'), 'utf8');
  const win = {}; win.self = win;
  vm.runInNewContext(code, win);
  ok(win.MozaikSolver && typeof win.MozaikSolver.findHint === 'function', 'UMD: window.MozaikSolver');
}

// ---------- performans: 10×10 findHint ----------
{
  const tens = levels.filter((L) => L.n === 10).concat(daily.filter((L) => L.n === 10));
  let total = 0, calls = 0, worst = 0;
  for (const L of tens) {
    const grid = S.parseRegions(10, L.regions), state = emptyState(10);
    for (;;) {
      const t0 = process.hrtime.bigint();
      const h = S.findHint(10, grid, state, L.solution);
      const dt = Number(process.hrtime.bigint() - t0) / 1e6;
      total += dt; calls++; if (dt > worst) worst = dt;
      if (!h) break;
      for (const [r, c] of h.place) state[r][c] = 2;
      for (const [r, c] of h.eliminate) state[r][c] = 1;
    }
  }
  console.log(`findHint 10×10: ${calls} çağrı, ortalama ${(total / calls).toFixed(2)} ms, en kötü ${worst.toFixed(1)} ms`);
  ok(total / calls < 50, 'findHint 10×10 ortalama < 50 ms (Node)');
}

console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
