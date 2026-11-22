#!/usr/bin/env node
/*
 * Mozaik Mantık — Dart paketi (packages/mozaik_core) için altın (golden) fikstür üretici.
 * Kaynak davranış: tools/solver.js + web/src/*.js (DEĞİŞTİRİLMEZ; tarayıcı modülleri `vm` ile yüklenir).
 * Çalıştır: node tools/golden.js   ->  packages/mozaik_core/test/golden/*.json
 *
 * Fikstürler (tümü tohumlu, deterministik):
 *   solve.json          (a) 300 seviye + 400 günlük + 3 öğretici: solveLogic + countSolutions
 *   trace_*.json        (b) her bulmacada ipuçlarını art arda uygulayan tam çözüm izi (Game.getHint/applyHint)
 *   hints_random.json   (c) tohumlu oyuncu tahtalarında findHint (solution ile ve parametresiz)
 *   game.json           (ek) Game olay dizileri: dokunma, uzun basma, sürükleme, geri/ileri al, ipucu akışı, kayıt
 *   economy.json        (d) ekonomi/reklam/ilerleme olay dizileri -> durum
 *   daily.json          (e) tarih -> gün#, dow, seçilen bulmaca; Türkiye gece yarısı; seri senaryoları
 *   share.json          (f) paylaşım metni (8 dil)
 *   stars.json          (g) yıldız tablosu
 *   save.json           (ek) bozuk/eksik kayıtların tür denetimli yüklenmesi (migrate) + satın alma kaydı
 *
 * Kompakt ipucu biçimi (hint -> h):
 *   null | { k: kind, t: tech, a: areas[], p: place[], e: eliminate[], c: cells[], x: explainKey }
 *   p/e/c hücreleri düz indeks (r*n+c), sıra korunur. area her zaman areas[0]'dır (üretimde doğrulanır).
 */
'use strict';
process.env.TZ = 'Europe/Istanbul';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'packages', 'mozaik_core', 'test', 'golden');
fs.mkdirSync(OUT, { recursive: true });

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const LEVELS = JSON.parse(read('data/levels.json')).levels;
const DAILY = JSON.parse(read('data/daily.json')).puzzles;
const TUT = JSON.parse(read('data/tutorial.json')).levels;
const ALL = [].concat(LEVELS, DAILY, TUT);

// ---------- tohumlu PRNG
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- web modüllerini vm ile yükle
const MODS = ['config', 'util', 'i18n', 'state', 'economy', 'daily', 'share', 'logic', 'progress', 'data'];
const SRC = {};
SRC.solver = read('tools/solver.js');
for (const m of MODS) SRC[m] = read('web/src/' + m + '.js');

function makeCtx(override) {
  const ls = {};
  const sandbox = {
    console,
    __now: Date.UTC(2026, 10, 22, 9, 0, 0),
    localStorage: {
      getItem: (k) => (k in ls ? ls[k] : null),
      setItem: (k, v) => { ls[k] = String(v); },
      removeItem: (k) => { delete ls[k]; }
    },
    __ls: ls,
    MZ_DATA: { levels: { levels: LEVELS }, daily: { puzzles: DAILY }, tutorial: { levels: TUT }, i18n: {} },
    __MZ_CONFIG_OVERRIDE: override ? JSON.parse(JSON.stringify(override)) : undefined
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  // Saat taklidi: argümansız new Date() ve Date.now() -> __now
  vm.runInContext('(function(){var R=Date;function D(){var a=[].slice.call(arguments);if(!(this instanceof D))return R();' +
    'return a.length?new (Function.prototype.bind.apply(R,[null].concat(a)))():new R(window.__now);}' +
    'D.prototype=R.prototype;D.UTC=R.UTC;D.parse=R.parse;D.now=function(){return window.__now;};window.Date=D;})();', ctx);
  vm.runInContext(SRC.solver, ctx, { filename: 'solver.js' });
  for (const m of MODS) vm.runInContext(SRC[m], ctx, { filename: m + '.js' });
  return ctx;
}
const base = makeCtx();
const MZ = base.MZ;
const Solver = base.MozaikSolver;
const J = (x) => JSON.parse(JSON.stringify(x));

function writeOut(name, obj) {
  const p = path.join(OUT, name);
  const s = JSON.stringify(obj);
  fs.writeFileSync(p, s + '\n');
  console.log(name.padEnd(22), (s.length / 1024).toFixed(0).padStart(6) + ' KB');
}

function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function compact(n, h) {
  if (h === null || h === undefined) return null;
  if (!deepEq(h.area, h.areas[0])) throw new Error('area != areas[0]');
  const f = (L) => L.map((p) => p[0] * n + p[1]);
  return { k: h.kind, t: h.tech, a: J(h.areas), p: f(h.place), e: f(h.eliminate), c: f(h.cells), x: h.explainKey };
}
const enc = (cells) => Array.prototype.join.call(cells, '');

// ===================================================================== (a) solve
const solve = ALL.map((lv) => {
  const rg = Solver.parseRegions(lv.n, lv.regions);
  const s = Solver.solveLogic(lv.n, rg);
  return { id: lv.id, n: lv.n, regions: lv.regions, solution: lv.solution, solved: s.solved, maxTech: s.maxTech, steps: s.steps,
    techCounts: s.techCounts, count: Solver.countSolutions(lv.n, rg), count5: Solver.countSolutions(lv.n, rg, 5),
    canon: Solver.canonicalKey(lv.n, lv.regions) };
});
writeOut('solve.json', solve);

// ===================================================================== (b) tam çözüm izi
const Game = MZ.Logic.Game;
const traceStates = {};    // id -> [cells string per step] (c için)
function trace(lv, idx) {
  const autoX = idx % 2 === 0;
  const g = new Game({ n: lv.n, regions: lv.regions, solution: lv.solution, settings: { autoX, quickStone: false } });
  const steps = [];
  const states = [enc(g.cells)];
  for (let guard = 0; guard < 400; guard++) {
    const h = g.getHint();
    if (!h) break;
    g.applyHint(h);
    steps.push({ h: compact(lv.n, h), s: enc(g.cells) });
    states.push(enc(g.cells));
  }
  traceStates[lv.id] = states;
  return { id: lv.id, autoX, steps, complete: g.isComplete(), log: J(g.log), strip: g.strip() };
}
const groups = { levels: LEVELS, daily: DAILY, tutorial: TUT };
let traceTotal = 0;
for (const k of Object.keys(groups)) {
  const out = groups[k].map((lv, i) => trace(lv, i));
  out.forEach((t) => { traceTotal += t.steps.length; });
  writeOut('trace_' + k + '.json', out);
}

// ===================================================================== (c) rastgele tahtalar
{
  const rnd = mulberry32(20261122);
  const ri = (k) => Math.floor(rnd() * k);
  const cases = [];
  const COUNT = 3000;
  const big = ALL.filter((l) => l.n >= 9);
  for (let q = 0; q < COUNT; q++) {
    const lv = rnd() < 0.5 ? big[ri(big.length)] : ALL[ri(ALL.length)], n = lv.n, N = n * n;
    let st;
    const mode = rnd();
    if (mode < 0.15) {
      st = new Array(N).fill(0);
      for (let i = 0; i < N; i++) { const x = rnd(); st[i] = x < 0.3 ? 1 : 0; }
      const k = ri(3);
      for (let j = 0; j < k; j++) st[ri(N)] = 2;
    } else {
      const states = traceStates[lv.id];
      const s = states[ri(states.length)];
      st = s.split('').map((ch) => (ch === '3' ? 1 : +ch));
      const ops = rnd() < 0.35 ? 0 : 1 + ri(3);
      for (let j = 0; j < ops; j++) {
        const op = rnd() < 0.5 ? 3 + ri(2) : ri(6), i = ri(N);
        if (op === 0) st[i] = 1;                                        // rastgele X
        else if (op === 1) { const r = ri(n); st[r * n + lv.solution[r]] = 1; }   // çözüme X
        else if (op === 2) st[i] = 2;                                   // (çoğunlukla) yanlış taş
        else if (op === 3) { for (let z = 0; z < N; z++) if (st[z] === 1 && rnd() < 0.5) st[z] = 0; }  // X temizle
        else if (op === 4) { for (let z = 0; z < N; z++) if (st[z] === 2 && rnd() < 0.5) st[z] = 0; }  // taş kaldır
        else st[i] = 0;
      }
    }
    const grid = [];
    for (let r = 0; r < n; r++) grid.push(st.slice(r * n, r * n + n));
    const rg = Solver.parseRegions(n, lv.regions);
    const hs = compact(n, Solver.findHint(n, rg, grid, lv.solution));
    const hn = compact(n, Solver.findHint(n, rg, grid));
    const cb = Solver.checkBoard(n, rg, grid);
    cases.push({ id: lv.id, s: st.join(''), sol: hs, nosol: hn, chk: { c: cb.conflicts.map((p) => p[0] * n + p[1]), ok: cb.complete } });
  }
  const kinds = {};
  cases.forEach((c) => { const k = c.sol ? c.sol.k + c.sol.t : 'null'; kinds[k] = (kinds[k] || 0) + 1; });
  console.log('  rastgele dağılım (solution ile):', JSON.stringify(kinds));
  writeOut('hints_random.json', cases);
}

// ===================================================================== Game olay dizileri
{
  const rnd = mulberry32(777);
  const ri = (k) => Math.floor(rnd() * k);
  const scen = [];
  for (let q = 0; q < 160; q++) {
    const pool = q < 12 ? TUT : ALL;
    const lv = pool[ri(pool.length)], n = lv.n, N = n * n;
    const mode = q < 12 ? 'tutorial' : (rnd() < 0.2 ? 'daily' : 'level');
    const settings = { autoX: rnd() < 0.6, quickStone: rnd() < 0.3 };
    const tutFirst = mode === 'tutorial' && lv.firstHint && lv.firstHint.place && lv.firstHint.place[0] ? lv.firstHint.place[0][0] * n + lv.firstHint.place[0][1] : null;
    const opts = { n, regions: lv.regions, solution: lv.solution, settings, mode, tutFirst };
    const g = new Game(J(opts));
    let bal = ri(6);
    const bal0 = bal;
    const eco = { canAfford: (k) => bal >= k, spend: (k) => { if (bal < k) return false; bal -= k; return true; } };
    const ops = [];
    const nearSol = () => { const r = ri(n); return [r, rnd() < 0.6 ? lv.solution[r] : ri(n)]; };
    const L = 30 + ri(40);
    for (let s = 0; s < L; s++) {
      const x = rnd();
      let op;
      if (x < 0.30) op = ['tap'].concat(nearSol());
      else if (x < 0.38) op = ['longPress'].concat(nearSol());
      else if (x < 0.46) { const path0 = []; const k = 1 + ri(6); for (let z = 0; z < k; z++) path0.push([ri(n), ri(n)]); op = ['drag', [ri(n), ri(n)], path0, rnd() < 0.15]; }
      else if (x < 0.58) op = ['undo'];
      else if (x < 0.64) op = ['redo'];
      else if (x < 0.82) op = ['hintPress'];
      else if (x < 0.86) op = ['grant', 1 + ri(3)];
      else if (x < 0.92) op = ['applyHint'];
      else if (x < 0.95) op = ['setWon', rnd() < 0.5];
      else op = ['roundtrip'];
      let ret = null;
      switch (op[0]) {
        case 'tap': ret = g.tap(op[1], op[2]); break;
        case 'longPress': ret = g.longPress(op[1], op[2]); break;
        case 'drag': {
          const m = g.dragBegin(op[1][0], op[1][1]);
          const over = op[2].map((p) => g.dragOver(p[0], p[1]));
          const end = op[3] ? (g.dragCancel(), 'cancel') : g.dragEnd();
          ret = { m: m === undefined ? null : m, over, end };
          break;
        }
        case 'undo': ret = g.undo(); break;
        case 'redo': ret = g.redo(); break;
        case 'hintPress': ret = g.hintPress(eco); break;
        case 'grant': bal += op[1]; break;
        case 'applyHint': { const h = g.getHint(); ret = h ? g.applyHint(h) : 'none'; break; }
        case 'setWon': g.won = op[1]; break;
        case 'roundtrip': {
          const ser = J(g.serialize());
          const g2 = new Game(J(opts)); g2.restore(ser);
          ret = deepEq(J(g2.serialize()), ser);
          break;
        }
      }
      ops.push({
        op, ret: ret === undefined ? null : J(ret),
        c: enc(g.cells), l: g.log.map((e) => e.i + (e.h ? 'h' : '') + (e.x ? 'x' : '')).join(','),
        x: g.errors, hi: g.hints, u: g.undoStack.length, r: g.redoStack.length,
        st: g.hintStage(), cost: g.won || mode === 'tutorial' ? null : g.hintNextCost(), bal,
        cu: g.canUndo(), cr: g.canRedo(), done: g.isComplete(), tt: g.nextTutorialTarget()
      });
    }
    scen.push({ opts, bal0, ops, ser: J(g.serialize()), strip: g.strip() });
  }
  writeOut('game.json', scen);
}

// ===================================================================== (d) ekonomi / reklam / ilerleme
const OVERRIDES = [
  null,
  { ads: { dailyCap: 3 } },
  { ads: { interstitialEnabled: false } },
  { ads: { minGapSec: 30, everyLevels: 2, firstFreeLevels: 2 } },
  { hints: { cap: 20, start: 0, freeCap: 3 } },
  { ads: { requireOnline: false, rewardedHintsPerDay: 2 } },
  { unlock: { completed: 5, star2Count: 3 } }
];
const DAY_MS = 86400000;
function isoToMs(iso, h) { const p = iso.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2], h || 6, 0, 0); }
function ecoSummary(c) {
  const d = c.MZ.State.data;
  return J({ hints: d.hints, ads: d.ads, daily: { streak: d.daily.streak, lastDay: d.daily.lastDay, shields: d.daily.shields,
    broken: d.daily.broken, lastRescueDay: d.daily.lastRescueDay, done: Object.keys(d.daily.done).length },
    levels: Object.keys(d.progress.levels).length, gallery: d.gallery, purchase: c.MZ.State.purchase() });
}
function runEco(seed, override, special) {
  const c = makeCtx(override);
  const M = c.MZ;
  const rnd = mulberry32(seed);
  const ri = (k) => Math.floor(rnd() * k);
  let today = '2026-11-22', now = isoToMs(today, 7);
  c.__now = now;
  M.State.load();
  const ops = [];
  const packs = M.Config.packs;
  const cursor = {};
  packs.forEach((p) => { cursor[p] = 0; });
  const fakeGame = (hints, errors, elapsed, strip) => ({ hints, errors, elapsed, strip: () => strip.slice() });
  function exec(op) {
    c.__now = now;
    switch (op[0]) {
      case 'day': today = M.Util.addDays(today, op[1]); now = isoToMs(today, 7) + op[2] * 1000; c.__now = now; return null;
      case 'wait': now += op[1] * 1000; c.__now = now; return null;
      case 'dailyLogin': return M.Economy.dailyLogin(today);
      case 'evaluate': { const r = M.Daily.evaluate(M.State.data.daily, today); M.State.save(); return r; }
      case 'spend': return M.Economy.spend(op[1]);
      case 'canAfford': return M.Economy.canAfford(op[1]);
      case 'grant': return M.Economy.grant(op[1]);
      case 'dailyPuzzleDone': return M.Economy.onDailyPuzzleDone();
      case 'rewardedHintsLeft': return M.Economy.rewardedHintsLeft(today);
      case 'canWatch': return M.Economy.canWatch(op[1], today);
      case 'giftAvailable': return M.Economy.giftAvailable(today);
      case 'finishRewarded': return M.Economy.finishRewarded(op[1], op[2], now, today);
      case 'completeLevel': {
        const lv = M.Data.level(op[1]);
        return M.Progress.completeLevel(lv, fakeGame(op[2], op[3], op[4], []));
      }
      case 'completeDaily': return M.Progress.completeDaily(today, fakeGame(op[1], op[2], op[3], op[4]));
      case 'interstitial': {
        const d = M.Economy.interstitialDecision(now, op[1], today);
        if (d.show && op[2]) M.Economy.markInterstitialShown(now);
        return d;
      }
      case 'removeAds': return M.Economy.removeAds(today);
      case 'restore': return M.Economy.restore();
      case 'packLock': return M.Progress.packLock(op[1], op[2]);
      case 'packStats': return M.Progress.packStats(op[1]);
      case 'unique': return M.Economy.uniqueCompleted();
      case 'canRescue': return M.Daily.canRescue(M.State.data.daily, today);
      case 'checkGallery': return M.Progress.checkGallery();
      case 'reload': M.State.save(); M.State.load(); return null;
      case 'reset': M.State.reset(); return null;
    }
    throw new Error('op? ' + op[0]);
  }
  function nextLevelId(pk) { const list = M.Data.packs[pk]; const id = list[cursor[pk] % list.length].id; cursor[pk]++; return id; }
  function randomOp() {
    const x = rnd();
    if (x < 0.08) return ['day', ri(4), ri(3600)];
    if (x < 0.14) return ['wait', [10, 60, 119, 121, 200, 299, 301, 900][ri(8)]];
    if (x < 0.20) return ['dailyLogin'];
    if (x < 0.22) return ['evaluate'];
    if (x < 0.27) return ['spend', 1 + ri(2)];
    if (x < 0.29) return ['canAfford', ri(4)];
    if (x < 0.31) return ['grant', ri(4)];
    if (x < 0.32) return ['dailyPuzzleDone'];
    if (x < 0.34) return ['rewardedHintsLeft'];
    if (x < 0.36) return ['canWatch', rnd() < 0.5 ? 'hint' : 'streak'];
    if (x < 0.37) return ['giftAvailable'];
    if (x < 0.44) return ['finishRewarded', rnd() < 0.6 ? 'hint' : 'streak', rnd() < 0.75];
    if (x < 0.62) { const pk = rnd() < 0.7 ? 'cirak' : packs[ri(packs.length)]; return ['completeLevel', nextLevelId(pk), ri(3), ri(4), 30000 + ri(200000)]; }
    if (x < 0.67) return ['completeDaily', ri(3), ri(4), 40000 + ri(300000), ['c', 'h', 'x', 'c', 'c'].slice(0, 3 + ri(3))];
    if (x < 0.80) return ['interstitial', rnd() < 0.9, rnd() < 0.8];
    if (x < 0.81) return ['removeAds'];
    if (x < 0.82) return ['restore'];
    if (x < 0.85) return ['packLock', ri(5), rnd() < 0.1];
    if (x < 0.86) return ['packStats', packs[ri(5)]];
    if (x < 0.87) return ['unique'];
    if (x < 0.89) return ['canRescue'];
    if (x < 0.90) return ['checkGallery'];
    if (x < 0.95) return ['reload'];
    return ['day', 1, ri(3600)];
  }
  let script = [];
  if (special === 'pack') {
    M.Data.packs.cirak.forEach((l, i) => script.push(['completeLevel', l.id, i % 3, i % 4, 50000 + i]));
    for (let i = 0; i < 12; i++) script.push(['interstitial', true, true], ['wait', 130]);
    script.push(['packLock', 1, false], ['packStats', 'cirak'], ['checkGallery'], ['reload']);
    M.Data.packs.kalfa.slice(0, 10).forEach((l) => script.push(['completeLevel', l.id, 0, 0, 1000]));
    script.push(['packLock', 2, false]);
  } else if (special === 'ads') {
    const lv = M.Data.packs.kalfa;
    for (let i = 0; i < 40; i++) {
      script.push(['completeLevel', lv[i].id, 0, 0, 1000], ['interstitial', i % 13 !== 5, true], ['wait', [30, 100, 121, 250, 310][i % 5]]);
      if (i % 6 === 2) script.push(['finishRewarded', i % 12 === 2 ? 'hint' : 'streak', true]);
      if (i % 6 === 3) script.push(['finishRewarded', 'hint', false], ['giftAvailable']);
      if (i === 25) script.push(['day', 1, 10], ['dailyLogin']);
    }
  } else if (special === 'month') {
    today = '2026-11-30'; now = isoToMs(today, 7);
    for (let i = 0; i < 33; i++) { script.push(['day', 1, 100], ['dailyLogin'], ['evaluate'], ['completeDaily', i % 2, i % 3, 60000, ['c', 'c', 'h']]); if (i % 9 === 4) script.push(['completeDaily', 0, 0, 1, ['c']]); }
    script.push(['checkGallery'], ['reload']);
  } else if (special === 'streak') {
    const gaps = [1, 1, 1, 1, 1, 1, 1, 2, 1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 5, 1];
    gaps.forEach((g) => { script.push(['day', g, 50], ['dailyLogin'], ['evaluate'], ['canRescue'], ['finishRewarded', 'streak', true], ['completeDaily', 0, 0, 5000, ['c']]); });
  } else {
    const L = 50 + ri(30);
    for (let i = 0; i < L; i++) script.push(randomOp());
  }
  const t0 = today, now0 = now;
  for (const op of script) {
    const ret = exec(op);
    ops.push({ op, ret: ret === undefined ? null : J(ret), s: ecoSummary(c), t: today, now });
  }
  M.State.save();
  return { seed, override, special: special || null, t0, now0, ops, final: J(M.State.data), stored: JSON.parse(c.__ls['mozaik.save.v1']) };
}
{
  const eco = [];
  for (let i = 0; i < 49; i++) eco.push(runEco(1000 + i, OVERRIDES[i % OVERRIDES.length], null));
  eco.push(runEco(1, null, 'pack'), runEco(2, { ads: { firstFreeLevels: 0 } }, 'pack'), runEco(3, null, 'month'), runEco(4, null, 'streak'), runEco(6, { ads: { firstFreeLevels: 1, dailyCap: 4 } }, 'ads'), runEco(7, { ads: { firstFreeLevels: 1, everyLevels: 1, minGapSec: 200 } }, 'ads'), runEco(5, { ads: { streakRescueWeeklyMax: 0 } }, 'streak'));
  writeOut('economy.json', eco);
}

// ===================================================================== (e) günlük
{
  const ctxPI = makeCtx({ daily: { selectMode: 'poolIndex' } });
  const noDow = DAILY.map((p) => { const q = J(p); delete q.dow; return q; });
  const onlyCirak = LEVELS.filter((l) => l.pack === 'cirak').map((p) => J(p));
  const days = [];
  let iso = '2026-11-01';
  while (iso <= '2028-03-05') {
    days.push({ d: iso, no: MZ.Daily.dayNumber(iso), wd: MZ.Util.weekday(iso), diff: MZ.Daily.targetDiff(iso),
      pick: MZ.Daily.pick(DAILY, iso).id, pickNoDow: MZ.Daily.pick(noDow, iso).id, pickCirak: MZ.Daily.pick(onlyCirak, iso).id,
      pickPI: ctxPI.MZ.Daily.pick(DAILY, iso).id, idx: MZ.Util.dayIndex(iso), dim: MZ.Util.daysInMonth(+iso.slice(0, 4), +iso.slice(5, 7)) });
    iso = MZ.Util.addDays(iso, 1);
  }
  // Türkiye saat dilimi (UTC+3, yaz saati yok) gece yarısı sınırları: anlık (ms) -> yerel gün
  const instants = [];
  const bases = ['2026-11-22', '2026-11-23', '2026-12-31', '2027-02-28', '2027-03-28', '2027-10-31', '2028-02-28', '2028-02-29'];
  for (const b of bases) {
    const p = b.split('-'), mid = Date.UTC(+p[0], +p[1] - 1, +p[2]) - 3 * 3600000;   // yerel 00:00
    for (const off of [-3600000, -1000, -1, 0, 1, 1000, 3 * 3600000 - 1, 3 * 3600000, 12 * 3600000, 24 * 3600000 - 1]) instants.push(mid + off);
  }
  const tz = instants.map((ms) => { base.__now = ms; return { ms, iso: MZ.Util.todayISO(), toMid: MZ.Util.msToMidnight(), day: MZ.Daily.dayNumber(MZ.Util.todayISO()), pick: MZ.Daily.pick(DAILY, MZ.Util.todayISO()).id }; });
  // seri senaryoları
  const rnd = mulberry32(4242);
  const ri = (k) => Math.floor(rnd() * k);
  const streaks = [];
  for (let s = 0; s < 80; s++) {
    const cfgCtx = s % 4 === 3 ? makeCtx({ daily: { shieldEvery: 3, shieldMax: 1 }, ads: { streakRescueWeeklyMax: 2 } }) : base;
    const D = cfgCtx.MZ.Daily;
    const d = { done: {}, streak: 0, lastDay: null, shields: 0, broken: null, lastRescueDay: null };
    let today = cfgCtx.MZ.Util.addDays('2026-11-22', ri(20));
    const start = today;
    const ops = [];
    for (let i = 0; i < 45; i++) {
      const x = rnd();
      let op, ret;
      if (x < 0.35) { const g = [0, 1, 1, 1, 1, 2, 2, 3, 4, 9][ri(10)]; today = cfgCtx.MZ.Util.addDays(today, g); op = ['day', g]; ret = null; }
      else if (x < 0.5) { op = ['evaluate']; ret = D.evaluate(d, today); }
      else if (x < 0.8) { op = ['complete', ri(3), ri(4)]; ret = D.complete(d, today, { time: 1000 * (i + 1), hints: op[1], errors: op[2], stars: cfgCtx.MZ.Logic.stars(op[1], op[2]), strip: ['c', 'h'], at: 1700000000000 + i }); }
      else if (x < 0.88) { op = ['canRescue']; ret = D.canRescue(d, today); }
      else if (x < 0.96) { op = ['rescue']; ret = D.rescue(d, today); }
      else { op = ['isDone']; ret = D.isDone(d, today); }
      const snap = J(d); const dk = Object.keys(d.done); snap.done = dk.length; snap.lastDone = dk.length ? dk[dk.length - 1] : null;
      ops.push({ op, t: today, ret: ret === undefined ? null : J(ret), d: snap });
    }
    streaks.push({ cfg: s % 4 === 3 ? 1 : 0, start, ops, final: J(d) });
  }
  const months = ['2026-11-22', '2027-02-01', '2028-02-15', '2026-12-31'].map((t) => ({ t, info: J(MZ.Daily.monthInfo(t)) }));
  const misc = { epoch: MZ.Config.daily.epoch, addDays: [['2026-11-22', -400], ['2026-12-31', 1], ['2028-02-28', 1], ['2027-03-01', -1]].map(([a, k]) => [a, k, MZ.Util.addDays(a, k)]),
    fmtTime: [0, 999, 1000, 59999, 60000, 61500, 3599999, 3600000, 6000000, -5].map((ms) => [ms, MZ.Util.fmtTime(ms), MZ.Util.fmtClock(ms)]) };
  writeOut('daily.json', { days, tz, streaks, months, misc });
}

// ===================================================================== (f) paylaşım
{
  const rnd = mulberry32(99);
  const ri = (k) => Math.floor(rnd() * k);
  const out = [];
  for (let s = 0; s < 30; s++) {
    const strip = []; const k = 4 + ri(7); for (let i = 0; i < k; i++) strip.push(['c', 'h', 'x', 'c', 'q'][ri(5)]);
    const o = { dayNo: 1 + ri(800), time: [0, 999, 65000, 754321, 3600000, 6100000][ri(6)] + ri(1000), hints: ri(4), errors: ri(5), stars: 1 + ri(3), streak: ri(120), strip };
    for (const lang of MZ.Config.languages) {
      const rtl = MZ.Config.rtlLanguages.indexOf(lang) >= 0;
      out.push({ lang, o, rtl, text: MZ.Share.build(Object.assign({}, o, { rtl })) });
    }
  }
  writeOut('share.json', out);
}

// ===================================================================== (g) yıldız
{
  const t = [];
  for (let h = 0; h <= 4; h++) for (let e = 0; e <= 5; e++) t.push([h, e, MZ.Logic.stars(h, e)]);
  writeOut('stars.json', t);
}

// ===================================================================== kayıt (migrate / restore)
{
  const rnd = mulberry32(31337);
  const ri = (k) => Math.floor(rnd() * k);
  const GARB = [null, true, false, 0, -5, 3.5, 7, 'x', '', '2026-11-22', '2026-1-2', [], [1, 2], {}, { a: 1 },
    { stars: 2, best: 1000, done: 3 }, { stars: 5 }, { stars: 1, best: 'q' }, { strip: ['c'] }, { key: 'level:c-001', g: {} },
    { streak: 3, missed: 1, day: '2026-11-22' }, { t: 'pack', k: 'cirak' }, 'light', 'dark', 'neon'];
  const c = makeCtx();
  const M = c.MZ;
  const filled = () => {
    const d = JSON.parse(JSON.stringify(M.State.load()));
    d.progress.levels = { 'c-001': { stars: 3, best: 52000, done: 2 }, 'c-002': { stars: 1, best: null, done: 1 } };
    d.daily.done = { '2026-11-22': { time: 1, hints: 0, errors: 0, stars: 3, strip: ['c'], streak: 1, dayNo: 1, at: 5 } };
    d.daily.streak = 1; d.daily.lastDay = '2026-11-22';
    d.gallery = [{ t: 'pack', k: 'cirak' }];
    d.current = { key: 'level:c-003', g: { c: '0'.repeat(25), l: [] } };
    return d;
  };
  const paths = [];
  (function walk(o, pre) {
    for (const k of Object.keys(o)) { paths.push(pre.concat(k)); if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) walk(o[k], pre.concat(k)); }
  })(filled(), []);
  const cases = [];
  const raws = ['', 'null', '[]', '{', '"str"', '42', '{"v":1}', '{"hints":5}', '{"hints":{"balance":-3}}', '{"lang":5,"extra":{"k":[1]}}',
    '{"daily":{"done":{"2026-11-22":{"strip":"x"},"bad":{"strip":[]},"2026-11-23":{"strip":[]}}}}',
    '{"progress":{"levels":{"a":{"stars":2.5},"b":{"stars":-1},"c":{"stars":3,"done":"2"},"d":[1]}}}'];
  for (const r of raws) cases.push(r);
  for (let i = 0; i < 260; i++) {
    const d = filled();
    const k = 1 + ri(4);
    for (let j = 0; j < k; j++) {
      const p = paths[ri(paths.length)];
      let o = d;
      for (let z = 0; z < p.length - 1; z++) { if (!o || typeof o !== 'object') { o = null; break; } o = o[p[z]]; }
      if (!o || typeof o !== 'object') continue;
      const x = rnd();
      if (x < 0.15) delete o[p[p.length - 1]];
      else if (x < 0.25) o['extra' + ri(3)] = GARB[ri(GARB.length)];
      else o[p[p.length - 1]] = J(GARB[ri(GARB.length)] === undefined ? null : GARB[ri(GARB.length)]);
    }
    cases.push(JSON.stringify(d));
  }
  const migrate = cases.map((raw) => {
    c.__ls['mozaik.save.v1'] = raw;
    if (raw === '') delete c.__ls['mozaik.save.v1'];
    return { raw, out: J(M.State.load()) };
  });
  const purchase = ['', 'x', 'null', '[]', '{}', '{"adFree":true}', '{"adFree":1,"bonusGranted":true}', '{"adFree":true,"bonusGranted":"y","z":3}'].map((raw) => {
    if (raw === '') delete c.__ls['mozaik.purchase.v1']; else c.__ls['mozaik.purchase.v1'] = raw;
    return { raw, out: J(M.State.purchase()) };
  });
  // Game.restore: bozuk girdiler
  const lv = LEVELS[0], n = lv.n;
  const g = new Game({ n, regions: lv.regions, solution: lv.solution, settings: { autoX: true, quickStone: false } });
  g.tap(0, lv.solution[0]); g.tap(0, lv.solution[0]); g.tap(1, 0); g.elapsed = 12345.6; g.undo();
  const good = J(g.serialize());
  const mut = (f) => { const o = J(good); f(o); return o; };
  const inputs = [good, null, 5, 'x', [], {},
    mut((o) => { o.c = o.c.slice(1); }), mut((o) => { o.c = '4' + o.c.slice(1); }), mut((o) => { o.c = ' ' + o.c.slice(1); }),
    mut((o) => { o.c = 1234; }), mut((o) => { o.l = 'x'; }), mut((o) => { o.l = [null, { i: 3, h: 1 }, { i: 99 }, { i: -1 }, { i: '2' }, { i: 4, x: 'y' }]; }),
    mut((o) => { o.u = [{ c: 'zz' }]; }), mut((o) => { o.u = 'x'; o.r = null; }), mut((o) => { o.e = '15'; o.h = true; o.x = 'abc'; }),
    mut((o) => { o.e = -4; o.h = [3]; o.x = []; }), mut((o) => { o.e = null; o.h = {}; o.x = [7]; }), mut((o) => { delete o.u; delete o.r; delete o.e; }),
    mut((o) => { o.r = [{ c: o.c, l: 'q' }]; }), mut((o) => { o.c = '\t' + o.c.slice(1); }), mut((o) => { o.e = ' 42 '; o.h = '2.5'; o.x = ''; })];
  const restore = inputs.map((inp) => {
    const g2 = new Game({ n, regions: lv.regions, solution: lv.solution, settings: { autoX: true, quickStone: false } });
    try { g2.restore(J(inp)); return { in: inp, ok: true, out: J(g2.serialize()) }; } catch (e) { return { in: inp, ok: false }; }
  });
  writeOut('save.json', { defaults: J(makeCtx().MZ.State.load()), migrate, purchase, restore: { level: lv.id, cases: restore } });
}

console.log('toplam iz adımı:', traceTotal);
