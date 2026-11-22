/* GEÇİCİ seviye üreticisi (yalnız web/dev). Tek çözümlü örnek seviyeler üretir ve kaba kuvvetle doğrular. */
var S = require('./solver-dev.js'), fs = require('fs');
var seed = 12345; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
function randSolution(n) {
  var cols = [];
  function go(r) {
    if (r === n) return true;
    var order = []; for (var c = 0; c < n; c++) order.push(c);
    order.sort(function () { return rnd() - 0.5; });
    for (var i = 0; i < order.length; i++) {
      var c = order[i]; if (cols.indexOf(c) >= 0) continue;
      if (r > 0 && Math.abs(cols[r - 1] - c) < 2) continue;
      cols[r] = c; if (go(r + 1)) return true; cols.length = r;
    }
    return false;
  }
  go(0); return cols;
}
function grow(n, sol) {
  var g = []; for (var r = 0; r < n; r++) { g[r] = []; for (var c = 0; c < n; c++) g[r][c] = -1; }
  var ord = sol.map(function (_, i) { return i; }).sort(function () { return rnd() - 0.5; });
  ord.forEach(function (row, k) { g[row][sol[row]] = k; });
  for (;;) {
    var fr = [];
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (g[r][c] < 0)
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var a = r + d[0], b = c + d[1];
        if (a >= 0 && b >= 0 && a < n && b < n && g[a][b] >= 0) fr.push([r, c, g[a][b]]);
      });
    if (!fr.length) break;
    var p = fr[Math.floor(rnd() * fr.length)]; g[p[0]][p[1]] = p[2];
  }
  return g.map(function (row) { return row.map(function (v) { return String.fromCharCode(65 + v); }).join(''); }).join('');
}

function allSol(n, g, limit) { var res = [], cs = [], uc = {}, ur = {};
  (function go(r) { if (res.length >= limit) return; if (r === n) { res.push(cs.slice()); return; }
    for (var c = 0; c < n; c++) { if (uc[c]) continue; var q = g[r][c]; if (ur[q]) continue; if (r > 0 && Math.abs(cs[r - 1] - c) < 2) continue;
      uc[c] = ur[q] = true; cs[r] = c; go(r + 1); uc[c] = ur[q] = false; } })(0); return res; }
function connected(n, g, k) { var cells = [], r, c; for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (g[r][c] === k) cells.push([r, c]);
  if (!cells.length) return false; var seen = {}, st = [cells[0]]; seen[cells[0]] = 1, cnt = 0; var cnt = 0;
  while (st.length) { var p = st.pop(); cnt++; [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) { var a = p[0]+d[0], b = p[1]+d[1]; if (a>=0&&b>=0&&a<n&&b<n&&g[a][b]===k&&!seen[[a,b]]) { seen[[a,b]] = 1; st.push([a,b]); } }); }
  return cnt === cells.length; }
function repair(n, sol, rs) {
  var g = S.parseRegions(n, rs);
  for (var it = 0; it < 400; it++) {
    var sols = allSol(n, g, 2); if (sols.length === 1) return g.map(function (row) { return row.map(function (v) { return String.fromCharCode(65 + v); }).join(''); }).join('');
    var alt = sols.filter(function (s) { return s.join() !== sol.join(); })[0], cand = [];
    for (var r = 0; r < n; r++) if (alt[r] !== sol[r]) { var c = alt[r]; [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) { var a = r+d[0], b = c+d[1]; if (a>=0&&b>=0&&a<n&&b<n&&g[a][b]!==g[r][c]) cand.push([r,c,g[a][b]]); }); }
    if (!cand.length) return null;
    var p = cand[Math.floor(rnd()*cand.length)], old = g[p[0]][p[1]]; g[p[0]][p[1]] = p[2];
    if (!connected(n, g, old)) g[p[0]][p[1]] = old;
  }
  return null;
}
function make(n, needT1) {
  for (var t = 0; t < 4000; t++) {
    var sol = randSolution(n), rs = repair(n, sol, grow(n, sol));
    if (!rs) continue;
    var lg = S.solveLogic(n, rs);
    if (needT1 && !lg.solved) continue;
    var cols = []; // çözümü bul
    var sol2 = (function () { var out; var g = S.parseRegions(n, rs); var cs = [], uc = {}, ur = {};
      (function go(r) { if (out) return; if (r === n) { out = cs.slice(); return; }
        for (var c = 0; c < n; c++) { if (uc[c]) continue; var q = g[r][c]; if (ur[q]) continue; if (r > 0 && Math.abs(cs[r - 1] - c) < 2) continue;
          uc[c] = ur[q] = true; cs[r] = c; go(r + 1); uc[c] = ur[q] = false; } })(0); return out; })();
    return { n: n, regions: rs, solution: sol2, tech: lg.solved ? 1 : 0, steps: lg.steps };
  }
  throw new Error('üretilemedi ' + n);
}
var out = { levels: [], daily: [], tut: [] };
var plan = [['cirak', 'c', [5, 5, 5, 5, 6, 6, 6, 6], true], ['kalfa', 'k', [7, 7, 7], false], ['usta', 'u', [8, 8, 8], false], ['basusta', 'b', [9, 9], false], ['nakkas', 'n', [10, 10, 10], false]];
plan.forEach(function (p) {
  p[2].forEach(function (n, i) {
    var L = make(n, p[3]); L.id = p[1] + '-' + ('00' + (i + 1)).slice(-3); L.pack = p[0];
    out.levels.push({ id: L.id, pack: L.pack, n: L.n, regions: L.regions, solution: L.solution, tech: L.tech, steps: L.steps });
  });
});
var dp = ['cirak', 'kalfa', 'usta', 'basusta', 'nakkas'], dn = [5, 7, 8, 9, 10];
for (var k = 0; k < 10; k++) {
  var pi = k % 5, L = make(dn[pi], pi === 0);
  out.daily.push({ id: 'd-' + ('000' + (k + 1)).slice(-4), pack: dp[pi], n: L.n, regions: L.regions, solution: L.solution, tech: L.tech, steps: L.steps });
}
[4, 5, 6].forEach(function (n, i) { var L = make(n, true); out.tut.push({ id: 't-00' + (i + 1), pack: 'tut', n: n, regions: L.regions, solution: L.solution, tech: 1, steps: L.steps }); });
fs.writeFileSync(__dirname + '/levels-dev.json', JSON.stringify({ version: 1, levels: out.levels }));
fs.writeFileSync(__dirname + '/daily-dev.json', JSON.stringify({ version: 1, puzzles: out.daily }));
fs.writeFileSync(__dirname + '/tutorial-dev.json', JSON.stringify({ version: 1, levels: out.tut }));
// doğrulama
out.levels.concat(out.daily, out.tut).forEach(function (L) {
  if (S.countSolutions(L.n, L.regions, 3) !== 1) throw new Error('tek çözüm değil ' + L.id);
  var g = S.parseRegions(L.n, L.regions), st = []; for (var r = 0; r < L.n; r++) { st[r] = []; for (var c = 0; c < L.n; c++) st[r][c] = L.solution[r] === c ? 2 : 0; }
  if (!S.checkBoard(L.n, g, st).complete) throw new Error('çözüm geçersiz ' + L.id);
});
console.log('tamam', out.levels.length, out.daily.length, out.tut.length);
