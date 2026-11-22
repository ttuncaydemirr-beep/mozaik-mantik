#!/usr/bin/env node
/*
 * Mozaik Mantık — seviye üretici (Node, bağımsız).
 *   node tools/generate.js                 -> data/levels.json, data/daily.json, data/tutorial.json
 *   node tools/generate.js --stats N SIZE  -> SIZE için N aday üretip tech dağılımını yazar (deneme)
 * Deterministik: tohumlu mulberry32; aynı komut aynı çıktıyı verir.
 * Hat: geçerli taş yerleşimi (permütasyon + değmeme) -> bölgeleri taşlardan büyüt ->
 *      tekil çözüme kadar bölge sınırı onar (ikinci çözümün hücresini komşu bölgeye ver) ->
 *      solveLogic ile tech -> hedef tech'e doğru bölge mutasyonuyla tırman (tekillik korunur).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('./solver.js');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (rng, k) => Math.floor(rng() * k);

function randomPlacement(n, rng) {
  // geri izlemeli rastgele permütasyon, |p[r]-p[r+1]|>=2
  const p = [], used = new Array(n).fill(false);
  function rec(r) {
    if (r === n) return true;
    const cols = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = ri(rng, i + 1); [cols[i], cols[j]] = [cols[j], cols[i]]; }
    for (const c of cols) {
      if (used[c]) continue;
      if (r > 0 && Math.abs(c - p[r - 1]) < 2) continue;
      used[c] = true; p.push(c);
      if (rec(r + 1)) return true;
      used[c] = false; p.pop();
    }
    return false;
  }
  rec(0);
  return p;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function growRegions(n, sol, rng, singleton) {
  const N = n * n, reg = new Int8Array(N).fill(-1);
  const weight = [];
  for (let g = 0; g < n; g++) { reg[g * n + sol[g]] = g; weight.push(0.3 + rng() * 1.7); }
  const single = singleton ? ri(rng, n) : -1;
  if (single >= 0) weight[single] = 0;
  let left = N - n;
  const sizes = new Array(n).fill(1);
  const maxSize = Math.floor(N * 0.3);
  while (left > 0) {
    // bölge seç (ağırlıklı), sınırından rastgele boş hücre al
    const front = [];
    for (let i = 0; i < N; i++) {
      if (reg[i] !== -1) continue;
      const r = (i / n) | 0, c = i % n;
      for (const [dr, dc] of DIRS) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const g = reg[rr * n + cc];
        if (g >= 0) front.push([i, g]);
      }
    }
    let tot = 0;
    const w = front.map(([, g]) => { const x = g === single ? 0 : (sizes[g] >= maxSize ? 0.001 : weight[g]); tot += x; return x; });
    let t = rng() * tot, k = 0;
    while (k < front.length - 1 && t >= w[k]) { t -= w[k]; k++; }
    const [cell, g] = front[k];
    reg[cell] = g; sizes[g]++; left--;
  }
  return reg;
}

function regToString(reg) { let s = ''; for (const g of reg) s += String.fromCharCode(65 + g); return s; }
function regToGrid(n, reg) { const out = []; for (let r = 0; r < n; r++) out.push(Array.from(reg.slice(r * n, r * n + n))); return out; }

function contiguous(n, reg, g) {
  const N = n * n; let start = -1, total = 0;
  for (let i = 0; i < N; i++) if (reg[i] === g) { total++; if (start < 0) start = i; }
  if (total === 0) return false;
  const seen = new Uint8Array(N), st = [start]; seen[start] = 1; let cnt = 0;
  while (st.length) {
    const i = st.pop(); cnt++;
    const r = (i / n) | 0, c = i % n;
    for (const [dr, dc] of DIRS) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const j = rr * n + cc;
      if (!seen[j] && reg[j] === g) { seen[j] = 1; st.push(j); }
    }
  }
  return cnt === total;
}

function designOk(n, reg, allowSingleton) {
  const N = n * n, sizes = new Array(n).fill(0);
  for (const g of reg) sizes[g]++;
  const maxSize = Math.floor(N * 0.3);
  let singles = 0;
  for (const s of sizes) { if (s > maxSize) return false; if (s < 2) singles++; }
  if (singles > (allowSingleton ? 1 : 0)) return false;
  // hiçbir bölge tüm satırı/sütunu kapsamasın
  for (let r = 0; r < n; r++) { let same = true; for (let c = 1; c < n; c++) if (reg[r * n + c] !== reg[r * n]) { same = false; break; } if (same) return false; }
  for (let c = 0; c < n; c++) { let same = true; for (let r = 1; r < n; r++) if (reg[r * n + c] !== reg[c]) { same = false; break; } if (same) return false; }
  return true;
}

// tüm çözümleri (en çok limit) döndür
function solutions(n, reg, limit) {
  const out = [], p = [];
  const regRows = new Int32Array(n);
  for (let i = 0; i < n * n; i++) regRows[reg[i]] |= 1 << ((i / n) | 0);
  const full = (1 << n) - 1;
  (function rec(r, cu, gu) {
    if (out.length >= limit) return;
    if (r === n) { out.push(p.slice()); return; }
    const rest = full & ~((1 << r) - 1);
    for (let g = 0; g < n; g++) if (!(gu & (1 << g)) && !(regRows[g] & rest)) return;
    for (let c = 0; c < n; c++) {
      if (cu & (1 << c)) continue;
      if (r > 0 && Math.abs(c - p[r - 1]) < 2) continue;
      const g = reg[r * n + c];
      if (gu & (1 << g)) continue;
      p.push(c); rec(r + 1, cu | (1 << c), gu | (1 << g)); p.pop();
    }
  })(0, 0, 0);
  return out;
}

// cell'i komşu bir bölgeye taşı (taş hücresi değil, eski bölge bitişik kalsın)
function tryMove(n, reg, sol, cell, rng, allowSingleton) {
  const r = (cell / n) | 0, c = cell % n;
  if (sol[r] === c) return false;
  const old = reg[cell], cands = [];
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
    const g = reg[rr * n + cc];
    if (g !== old && !cands.includes(g)) cands.push(g);
  }
  if (!cands.length) return false;
  const g = cands[ri(rng, cands.length)];
  reg[cell] = g;
  if (!contiguous(n, reg, old) || !designOk(n, reg, allowSingleton)) { reg[cell] = old; return false; }
  return true;
}

function makeUnique(n, reg, sol, rng, allowSingleton, maxIter) {
  for (let it = 0; it < maxIter; it++) {
    const sols = solutions(n, reg, 2);
    if (sols.length === 1) return true;
    const other = sols[0].join() === sol.join() ? sols[1] : sols[0];
    // ikinci çözümün, çözümde olmayan taş hücrelerinden birini başka bölgeye ver
    const cells = [];
    for (let rr = 0; rr < n; rr++) if (other[rr] !== sol[rr]) cells.push(rr * n + other[rr]);
    let moved = false;
    for (let tries = 0; tries < 12 && !moved; tries++) moved = tryMove(n, reg, sol, cells[ri(rng, cells.length)], rng, allowSingleton);
    if (!moved) {
      // rastgele bir sınır hücresi
      for (let tries = 0; tries < 30 && !moved; tries++) moved = tryMove(n, reg, sol, ri(rng, n * n), rng, allowSingleton);
      if (!moved) return false;
    }
  }
  return false;
}

// bölge numaralarını ilk görünüş sırasına göre yeniden ver (yerinde); çözücü tarama sırası kayıtla aynı olsun
function relabelReg(reg) { const m = new Int8Array(16).fill(-1); let k = 0; for (let i = 0; i < reg.length; i++) { if (m[reg[i]] < 0) m[reg[i]] = k++; reg[i] = m[reg[i]]; } }

function score(res) { return res.solved ? res.maxTech * 10000 + (res.techCounts[res.maxTech] * 100) + res.steps : -1; }

/*
 * Bir aday üret. target: {tech, minTechSteps}
 * Dönüş: {n, regions, solution, tech, steps, techCounts} | null
 */
function generateOne(n, seed, target, allowSingleton) {
  const rng = mulberry32(seed);
  const sol = randomPlacement(n, rng);
  let reg = growRegions(n, sol, rng, allowSingleton);
  if (!designOk(n, reg, allowSingleton)) {
    for (let k = 0; k < 40 && !designOk(n, reg, allowSingleton); k++) reg = growRegions(n, sol, rng, allowSingleton);
    if (!designOk(n, reg, allowSingleton)) return null;
  }
  if (!makeUnique(n, reg, sol, rng, allowSingleton, 60 + n * 10)) return null;
  relabelReg(reg);
  let res = S.solveLogic(n, regToGrid(n, reg));
  const goal = target.tech, minSteps = target.minTechSteps || 1;
  const fits = (r) => r.solved && r.maxTech === goal && r.techCounts[goal] >= minSteps;
  // tırmanma: tech hedefin altındaysa ya da T6 ise mutasyonla dene
  const budget = target.climb || 0;
  let cur = score(res);
  for (let it = 0; it < budget && !fits(res); it++) {
    const cell = ri(rng, n * n);
    const backup = Int8Array.from(reg);
    if (!tryMove(n, reg, sol, cell, rng, allowSingleton)) continue;
    relabelReg(reg);
    if (S.countSolutions(n, regToGrid(n, reg), 2) !== 1) { reg = backup; continue; }
    const r2 = S.solveLogic(n, regToGrid(n, reg));
    let sc = score(r2);
    if (r2.solved && r2.maxTech > goal) sc = -2 + 0; // hedefi aşma: istenmez
    if (!r2.solved) sc = -1;
    // kabul: daha iyi ya da eşit (düz alanda gezinme)
    if (sc >= cur || (!res.solved && r2.solved && r2.maxTech <= goal)) { res = r2; cur = sc; }
    else reg = backup;
  }
  if (!res.solved) return null;
  return { n, regions: regToString(reg), solution: sol, tech: res.maxTech, steps: res.steps, techCounts: res.techCounts.slice() };
}


// ---------------- veri üretimi ----------------
const PACKS = [
  { pack: 'cirak', pre: 'c', parts: [{ n: 5, count: 15 }, { n: 6, count: 35 }], tech: 1, minTechSteps: 1, singleton: true },
  { pack: 'kalfa', pre: 'k', parts: [{ n: 7, count: 60 }], tech: 2, minTechSteps: 1 },
  { pack: 'usta', pre: 'u', parts: [{ n: 8, count: 70 }], tech: 3, minTechSteps: 1 },
  { pack: 'basusta', pre: 'b', parts: [{ n: 9, count: 70 }], tech: 4, minTechSteps: 2 },
  { pack: 'nakkas', pre: 'n', parts: [{ n: 10, count: 50 }], tech: 5, minTechSteps: 1 }
];
// Günlük: gün #1 = Pazartesi. Pzt Çırak, Sal Kalfa, Çar Usta, Per Usta, Cum Başusta, Cmt Başusta, Paz Nakkaş
const WEEK = ['cirak', 'kalfa', 'usta', 'usta', 'basusta', 'basusta', 'nakkas'];
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAILY_COUNT = 400;
const MAX_ATTEMPTS = 400000;

function collect(n, need, spec, seedBase, seen, log) {
  const out = [];
  let k = 0;
  const t0 = Date.now();
  while (out.length < need) {
    if (++k > MAX_ATTEMPTS) throw new Error('Kota dolmadı: n=' + n + ' tech=' + spec.tech + ' (' + out.length + '/' + need + ')');
    const seed = (seedBase * 7919 + n * 1000003 + k * 2654435761) >>> 0;
    const r = generateOne(n, seed, { tech: spec.tech, minTechSteps: spec.minTechSteps, climb: 0 }, !!spec.singleton);
    if (!r || r.tech !== spec.tech || r.techCounts[spec.tech] < spec.minTechSteps) continue;
    const key = S.canonicalKey(n, r.regions);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  log(`  n=${n} tech=${spec.tech}: ${need} seviye, ${k} deneme, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
  return out;
}

// bölge harflerini ilk görünüş sırasına göre yeniden adlandır (harf sırası çözümü ima etmesin)
function relabel(s) { const m = {}; let k = 0, o = ''; for (const ch of s) { if (m[ch] === undefined) m[ch] = String.fromCharCode(65 + k++); o += m[ch]; } return o; }
function noFullLine(n, reg) {
  for (let r = 0; r < n; r++) { let same = true; for (let c = 1; c < n; c++) if (reg[r * n + c] !== reg[r * n]) { same = false; break; } if (same) return false; }
  for (let c = 0; c < n; c++) { let same = true; for (let r = 1; r < n; r++) if (reg[r * n + c] !== reg[c]) { same = false; break; } if (same) return false; }
  return true;
}
function strip(r, id, pack, extra) {
  return Object.assign({ id, pack, n: r.n, regions: relabel(r.regions), solution: r.solution, tech: r.tech, steps: r.steps }, extra || {});
}

function buildTutorial(log) {
  // T-1: 4×4, tek hücrelik bölge, yalnız T1. T-2: 5×5, tek hücrelik bölge, yalnız T1 (komşu X'leri gösterilir).
  // T-3: 6×6, ilk çıkarım T2 "bölge tek satırda" olmalı, en zor T2.
  const out = [];
  const specs = [
    { n: 4, test: (r, g) => r.tech === 1 && hasSingleton(r) },
    { n: 5, test: (r, g) => r.tech === 1 && hasSingleton(r) && r.steps === 5 },
    { n: 6, test: (r, g) => r.tech === 2 && r.techCounts[2] <= 2 && firstIsRegionRowLock(r, g) }
  ];
  specs.forEach((sp, idx) => {
    for (let k = 1; k < 200000; k++) {
      const rng = mulberry32(900000 + idx * 100000 + k);
      const sol = randomPlacement(sp.n, rng);
      const reg = growRegions(sp.n, sol, rng, sp.n <= 5);
      relabelReg(reg);
      const sizes = new Array(sp.n).fill(0); for (const g of reg) sizes[g]++;
      if (sp.n === 6 && Math.min(...sizes) < 2) continue;
      if (!noFullLine(sp.n, reg) || Math.max(...sizes) > Math.ceil(sp.n * sp.n * 0.4)) continue;
      if (S.countSolutions(sp.n, regToGrid(sp.n, reg), 2) !== 1) continue;
      const res = S.solveLogic(sp.n, regToGrid(sp.n, reg));
      if (!res.solved) continue;
      const r = { n: sp.n, regions: regToString(reg), solution: sol, tech: res.maxTech, steps: res.steps, techCounts: res.techCounts };
      const grid = regToGrid(sp.n, reg);
      if (!sp.test(r, grid)) continue;
      const empty = []; for (let i = 0; i < sp.n; i++) empty.push(new Array(sp.n).fill(0));
      const h = S.findHint(sp.n, S.parseRegions(sp.n, relabel(r.regions)), empty);
      out.push(strip(r, 't-' + (idx + 1), 'tutorial', { teach: ['tut_1', 'tut_2', 'tut_3'][idx], firstHint: { tech: h.tech, area: h.area, place: h.place, eliminate: h.eliminate } }));
      log(`  öğretici ${idx + 1}: ${sp.n}×${sp.n}, ${k} deneme`);
      return;
    }
    throw new Error('öğretici ' + (idx + 1) + ' bulunamadı');
  });
  return out;
}
function hasSingleton(r) { const c = {}; for (const ch of r.regions) c[ch] = (c[ch] || 0) + 1; return Object.values(c).some(v => v === 1); }
function firstIsRegionRowLock(r, grid) {
  const empty = []; for (let i = 0; i < r.n; i++) empty.push(new Array(r.n).fill(0));
  const h = S.findHint(r.n, grid, empty);
  return h && h.tech === 2 && h.areas[0].type === 'region' && h.areas[1].type === 'row';
}

function build() {
  const log = (m) => console.log(m);
  const T = Date.now();
  const seen = new Set();
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  log('Seviyeler:');
  const levels = [];
  for (const P of PACKS) {
    let items = [];
    for (const part of P.parts) items = items.concat(collect(part.n, part.count, P, 1, seen, log));
    items.sort((a, b) => (a.tech - b.tech) || (a.steps - b.steps) || (a.n - b.n));
    items.forEach((r, i) => levels.push(strip(r, P.pre + '-' + String(i + 1).padStart(3, '0'), P.pack)));
  }

  log('Günlük havuz:');
  const need = {};
  for (let d = 0; d < DAILY_COUNT; d++) need[WEEK[d % 7]] = (need[WEEK[d % 7]] || 0) + 1;
  const pools = {};
  for (const P of PACKS) {
    const cnt = need[P.pack];
    let items = [];
    if (P.parts.length === 2) {
      const a = Math.round(cnt * P.parts[0].count / (P.parts[0].count + P.parts[1].count));
      const A = collect(P.parts[0].n, a, P, 7, seen, log), B = collect(P.parts[1].n, cnt - a, P, 7, seen, log);
      // karıştır: 5×5 ve 6×6 haftalara dağılsın
      let ia = 0, ib = 0;
      for (let i = 0; i < cnt; i++) {
        const wantA = Math.round((i + 1) * a / cnt) > ia;
        items.push(wantA && ia < A.length ? A[ia++] : (ib < B.length ? B[ib++] : A[ia++]));
      }
    } else items = collect(P.parts[0].n, cnt, P, 7, seen, log);
    pools[P.pack] = { items, pre: P.pre, i: 0 };
  }
  const puzzles = [];
  for (let d = 0; d < DAILY_COUNT; d++) {
    const pk = WEEK[d % 7], pool = pools[pk];
    const r = pool.items[pool.i++];
    puzzles.push(strip(r, 'd-' + String(d + 1).padStart(4, '0'), pk, { dow: DOW[d % 7] }));
  }

  log('Öğretici:');
  const tutorial = buildTutorial(log);

  fs.writeFileSync(path.join(dataDir, 'levels.json'), JSON.stringify({ version: 1, levels }, null, 0).replace(/\},\{/g, '},\n{'));
  fs.writeFileSync(path.join(dataDir, 'daily.json'), JSON.stringify({
    version: 1,
    note: 'Gun #1 = Pazartesi kabul edilir. puzzles[(gun-1) % 400]. Haftalik dongu: mon cirak, tue kalfa, wed/thu usta, fri/sat basusta, sun nakkas. Yayin gunu #1 Pazartesi degilse uygulama haftanin gunune gore esleme yapmali (bkz. rapor).',
    puzzles
  }, null, 0).replace(/\},\{/g, '},\n{'));
  fs.writeFileSync(path.join(dataDir, 'tutorial.json'), JSON.stringify({ version: 1, levels: tutorial }, null, 2));
  log(`Bitti: ${levels.length} seviye, ${puzzles.length} günlük, ${tutorial.length} öğretici, ${((Date.now() - T) / 1000).toFixed(1)} sn`);
}

module.exports = { mulberry32, generateOne, regToGrid, contiguous, designOk, build };

// ---------------- komut satırı ----------------
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--stats') {
    const cnt = +args[1], n = +args[2], tech = +(args[3] || 5), climb = +(args[4] || 0);
    const hist = {}; const t0 = Date.now(); let nulls = 0;
    for (let s = 1; s <= cnt; s++) {
      const r = generateOne(n, 1000 + s, { tech, climb, minTechSteps: 1 }, args[5] === 's');
      if (!r) { nulls++; continue; }
      hist[r.tech] = (hist[r.tech] || 0) + 1;
    }
    console.log('n', n, 'hist', hist, 'null', nulls, 'ms/aday', ((Date.now() - t0) / cnt).toFixed(1));
    process.exit(0);
  }
  build();
}
