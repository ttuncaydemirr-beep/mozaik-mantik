/* GEÇİCİ YER TUTUCU çözücü (web/dev). Asıl tools/solver.js gelince kullanılmaz.
   Brifteki API'yi taklit eder; findHint yalnızca T1 (tek aday). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MozaikSolver = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function parseRegions(n, s) {
    var g = [];
    for (var r = 0; r < n; r++) { g[r] = []; for (var c = 0; c < n; c++) g[r][c] = s.charCodeAt(r * n + c) - 65; }
    return g;
  }
  function reg(n, regions) { return typeof regions === 'string' ? parseRegions(n, regions) : regions; }
  function stonesOf(n, state) {
    var out = [];
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (state[r][c] === 2) out.push([r, c]);
    return out;
  }
  function checkBoard(n, regions, state) {
    regions = reg(n, regions);
    var st = stonesOf(n, state), bad = {}, i, j;
    for (i = 0; i < st.length; i++) for (j = i + 1; j < st.length; j++) {
      var a = st[i], b = st[j];
      if (a[0] === b[0] || a[1] === b[1] || regions[a[0]][a[1]] === regions[b[0]][b[1]] ||
          Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) < 2) { bad[a] = a; bad[b] = b; }
    }
    var conflicts = Object.keys(bad).map(function (k) { return bad[k]; });
    return { conflicts: conflicts, complete: st.length === n && conflicts.length === 0 };
  }
  function countSolutions(n, regions, limit) {
    regions = reg(n, regions); limit = limit || 2;
    var cols = [], usedC = {}, usedR = {}, count = 0;
    (function go(r) {
      if (count >= limit) return;
      if (r === n) { count++; return; }
      for (var c = 0; c < n; c++) {
        if (usedC[c]) continue;
        var g = regions[r][c]; if (usedR[g]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) < 2) continue;
        usedC[c] = usedR[g] = true; cols[r] = c;
        go(r + 1);
        usedC[c] = usedR[g] = false;
      }
    })(0);
    return count;
  }
  function attacks(n, regions, a, b) {
    return a[0] === b[0] || a[1] === b[1] || regions[a[0]][a[1]] === regions[b[0]][b[1]] ||
      Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) < 2;
  }
  function findHint(n, regions, state) {
    regions = reg(n, regions);
    var chk = checkBoard(n, regions, state);
    if (chk.conflicts.length) {
      return { kind: 'conflict', tech: 1, area: { type: 'cell', index: chk.conflicts[0] }, place: [], eliminate: [], explainKey: 'hint_fix_first' };
    }
    var st = stonesOf(n, state), r, c, k;
    function free(r, c) {
      if (state[r][c] !== 0) return false;
      for (var i = 0; i < st.length; i++) if (attacks(n, regions, [r, c], st[i])) return false;
      return true;
    }
    var areas = [];
    for (k = 0; k < n; k++) {
      var hasR = false, hasC = false, hasG = false;
      for (var i = 0; i < st.length; i++) {
        if (regions[st[i][0]][st[i][1]] === k) hasG = true;
      }
      if (!hasG) { var cl = []; for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (regions[r][c] === k && free(r, c)) cl.push([r, c]); areas.push({ type: 'region', index: k, cells: cl }); }
      for (i = 0; i < st.length; i++) { if (st[i][0] === k) hasR = true; if (st[i][1] === k) hasC = true; }
      if (!hasR) { var rl = []; for (c = 0; c < n; c++) if (free(k, c)) rl.push([k, c]); areas.push({ type: 'row', index: k, cells: rl }); }
      if (!hasC) { var cl2 = []; for (r = 0; r < n; r++) if (free(r, k)) cl2.push([r, k]); areas.push({ type: 'col', index: k, cells: cl2 }); }
    }
    for (var a = 0; a < areas.length; a++) {
      if (areas[a].cells.length === 1) {
        var cell = areas[a].cells[0], el = [];
        for (r = 0; r < n; r++) for (c = 0; c < n; c++)
          if (state[r][c] === 0 && !(r === cell[0] && c === cell[1]) && attacks(n, regions, [r, c], cell)) el.push([r, c]);
        return { kind: 'deduce', tech: 1, area: { type: areas[a].type, index: areas[a].index }, place: [cell], eliminate: el, explainKey: 'hint_t1' };
      }
    }
    return null;
  }
  function solveLogic(n, regions) {
    regions = reg(n, regions);
    var state = [], r, c, steps = 0;
    for (r = 0; r < n; r++) { state[r] = []; for (c = 0; c < n; c++) state[r][c] = 0; }
    for (;;) {
      var h = findHint(n, regions, state);
      if (!h || h.kind !== 'deduce') break;
      h.place.forEach(function (p) { state[p[0]][p[1]] = 2; }); steps++;
    }
    var ok = checkBoard(n, regions, state).complete;
    return { solved: ok, maxTech: ok ? 1 : 6, steps: steps };
  }
  return { parseRegions: parseRegions, findHint: findHint, solveLogic: solveLogic, countSolutions: countSolutions, checkBoard: checkBoard };
});
