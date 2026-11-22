// Mozaik Mantık — ortak çözücü (tools/solver.js birebir karşılığı).
//
// Kurallar: N×N ızgara, N bölge. Her satır/sütun/bölgede tam 1 taş, taşlar 8 yönde değmez.
// Teknikler: T1 tek aday; T2 bölge kilidi; T3 küme k=2,3; T4 ortak komşu + küme k=4;
// T5 derinlik-1 çelişki (en çok 2 tur). Bunlarla çözülemeyen = T6.
//
// Sıralama (birim sırası, eleme sırası, T5 aday sırası) JS ile aynıdır; altın testler
// (test/golden) bunu her seviye ve binlerce oyuncu tahtasında doğrular.
import 'dart:typed_data';

/// Hücre konumu (satır, sütun).
class Pos {
  final int r;
  final int c;
  const Pos(this.r, this.c);
  @override
  bool operator ==(Object other) => other is Pos && other.r == r && other.c == c;
  @override
  int get hashCode => r * 1031 + c;
  List<int> toJson() => [r, c];
  @override
  String toString() => '[$r,$c]';
}

/// İpucu/çakışma alanı: type = row | col | region | cell | nbr.
/// cell türünde [cell] doludur; diğerlerinde [index] (nbr için hücre indeksi).
class Area {
  final String type;
  final int index;
  final Pos? cell;
  const Area(this.type, this.index) : cell = null;
  const Area.cell(Pos p)
      : type = 'cell',
        index = -1,
        cell = p;
  Map<String, Object?> toJson() => {'type': type, 'index': cell != null ? cell!.toJson() : index};
  @override
  bool operator ==(Object other) =>
      other is Area && other.type == type && other.index == index && other.cell == cell;
  @override
  int get hashCode => Object.hash(type, index, cell);
  @override
  String toString() => 'Area($type, ${cell ?? index})';
}

/// findHint dönüşü. kind: conflict | deduce. Çakışmada tech = 0.
class Hint {
  final String kind;
  final int tech;
  final Area area;
  final List<Area> areas;
  final List<Pos> place;
  final List<Pos> eliminate;
  final List<Pos> cells;
  final String explainKey;
  const Hint({
    required this.kind,
    required this.tech,
    required this.area,
    required this.areas,
    required this.place,
    required this.eliminate,
    required this.cells,
    required this.explainKey,
  });
  bool get isConflict => kind == 'conflict';
  Map<String, Object?> toJson() => {
        'kind': kind,
        'tech': tech,
        'area': area.toJson(),
        'areas': areas.map((a) => a.toJson()).toList(),
        'place': place.map((p) => p.toJson()).toList(),
        'eliminate': eliminate.map((p) => p.toJson()).toList(),
        'cells': cells.map((p) => p.toJson()).toList(),
        'explainKey': explainKey,
      };
}

class SolveResult {
  final bool solved;
  final int maxTech;
  final int steps;

  /// [_, t1, t2, t3, t4, t5]
  final List<int> techCounts;
  const SolveResult(this.solved, this.maxTech, this.steps, this.techCounts);
  Map<String, Object?> toJson() =>
      {'solved': solved, 'maxTech': maxTech, 'steps': steps, 'techCounts': techCounts};
}

class BoardCheck {
  final List<Pos> conflicts;
  final bool complete;
  const BoardCheck(this.conflicts, this.complete);
}

// ---------------------------------------------------------------- iç yapılar

int _popcount(int x) {
  var c = 0;
  while (x != 0) {
    x &= x - 1;
    c++;
  }
  return c;
}

int _lowbit(int x) => (x & -x).bitLength - 1;

class _Ctx {
  final int n;
  final int nn;
  final Int8List reg;
  final Int8List rowOf;
  final Int8List colOf;
  final List<List<int>> unitCells;
  final List<List<int>> cellUnits;
  final List<Int32List> attackList;
  final List<List<int>> attackBits; // 4 × 32 bit kelime
  final Map<int, List<List<int>>> combos;
  final List<int> unitOrder;
  _Ctx(this.n, this.nn, this.reg, this.rowOf, this.colOf, this.unitCells, this.cellUnits, this.attackList,
      this.attackBits, this.combos, this.unitOrder);
}

Map<String, _Ctx> _ctxCache = {};

_Ctx _getCtx(int n, List<List<int>> regions) {
  final sb = StringBuffer('$n:');
  for (var r = 0; r < regions.length; r++) {
    if (r > 0) sb.write(';');
    sb.write(regions[r].join(','));
  }
  final key = sb.toString();
  final hit = _ctxCache[key];
  if (hit != null) return hit;
  final nn = n * n;
  final reg = Int8List(nn), rowOf = Int8List(nn), colOf = Int8List(nn);
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      final i = r * n + c;
      reg[i] = regions[r][c];
      rowOf[i] = r;
      colOf[i] = c;
    }
  }
  final unitCells = <List<int>>[];
  for (var r = 0; r < n; r++) {
    unitCells.add([for (var c = 0; c < n; c++) r * n + c]);
  }
  for (var c = 0; c < n; c++) {
    unitCells.add([for (var r = 0; r < n; r++) r * n + c]);
  }
  for (var k = 0; k < n; k++) {
    unitCells.add(<int>[]);
  }
  for (var i = 0; i < nn; i++) {
    unitCells[2 * n + reg[i]].add(i);
  }
  final cellUnits = <List<int>>[
    for (var i = 0; i < nn; i++) [rowOf[i], n + colOf[i], 2 * n + reg[i]]
  ];
  final attackList = <Int32List>[];
  final attackBits = <List<int>>[];
  for (var i = 0; i < nn; i++) {
    final lst = <int>[];
    final bits = List<int>.filled(4, 0);
    for (var j = 0; j < nn; j++) {
      if (j == i) continue;
      final dr = (rowOf[i] - rowOf[j]).abs(), dc = (colOf[i] - colOf[j]).abs();
      if (dr == 0 || dc == 0 || reg[i] == reg[j] || (dr <= 1 && dc <= 1)) {
        lst.add(j);
        bits[j >> 5] |= 1 << (j & 31);
      }
    }
    attackList.add(Int32List.fromList(lst));
    attackBits.add(bits);
  }
  final combos = <int, List<List<int>>>{};
  for (var k = 2; k <= 4; k++) {
    combos[k] = _combos(n, k);
  }
  final order = <int>[
    for (var k = 0; k < n; k++) 2 * n + k,
    for (var k = 0; k < n; k++) k,
    for (var k = 0; k < n; k++) n + k,
  ];
  final ctx = _Ctx(n, nn, reg, rowOf, colOf, unitCells, cellUnits, attackList, attackBits, combos, order);
  if (_ctxCache.length > 64) _ctxCache = {};
  _ctxCache[key] = ctx;
  return ctx;
}

List<List<int>> _combos(int n, int k) {
  final out = <List<int>>[];
  final acc = <int>[];
  void rec(int start) {
    if (acc.length == k) {
      out.add(List<int>.of(acc));
      return;
    }
    for (var x = start; x < n; x++) {
      acc.add(x);
      rec(x + 1);
      acc.removeLast();
    }
  }

  rec(0);
  return out;
}

// st: 0 aday, 1 elenmiş, 2 taş
void _place(_Ctx ctx, Uint8List st, int i) {
  st[i] = 2;
  final a = ctx.attackList[i];
  for (var k = 0; k < a.length; k++) {
    if (st[a[k]] == 0) st[a[k]] = 1;
  }
}

bool _unitSolved(_Ctx ctx, Uint8List st, int u) {
  final cells = ctx.unitCells[u];
  for (var k = 0; k < cells.length; k++) {
    if (st[cells[k]] == 2) return true;
  }
  return false;
}

List<int> _unitCands(_Ctx ctx, Uint8List st, int u) {
  final cells = ctx.unitCells[u];
  final out = <int>[];
  for (var k = 0; k < cells.length; k++) {
    if (st[cells[k]] == 0) out.add(cells[k]);
  }
  return out;
}

class _Masks {
  final Uint8List solved;
  final Int32List rowM;
  final Int32List colM;
  final Int32List regM;
  _Masks(this.solved, this.rowM, this.colM, this.regM);
}

_Masks _masks(_Ctx ctx, Uint8List st) {
  final n = ctx.n, uu = 3 * n;
  final solved = Uint8List(uu);
  final rowM = Int32List(uu), colM = Int32List(uu), regM = Int32List(uu);
  for (var i = 0; i < ctx.nn; i++) {
    final v = st[i];
    final r = ctx.rowOf[i], c = ctx.colOf[i], g = ctx.reg[i];
    if (v == 2) {
      solved[r] = 1;
      solved[n + c] = 1;
      solved[2 * n + g] = 1;
      continue;
    }
    if (v != 0) continue;
    final us = ctx.cellUnits[i];
    for (var k = 0; k < 3; k++) {
      final u = us[k];
      rowM[u] |= 1 << r;
      colM[u] |= 1 << c;
      regM[u] |= 1 << g;
    }
  }
  return _Masks(solved, rowM, colM, regM);
}

Area _unitArea(int n, int u) {
  if (u < n) return Area('row', u);
  if (u < 2 * n) return Area('col', u - n);
  return Area('region', u - 2 * n);
}

class _Ded {
  final bool contra;
  final int tech;
  final List<int> units;
  final int place;
  final List<int> elim;
  final int cell;
  _Ded.contra(this.units)
      : contra = true,
        tech = 0,
        place = -1,
        elim = const [],
        cell = -1;
  _Ded(this.tech, this.units, this.place, this.elim, {this.cell = -1}) : contra = false;
}

_Ded? _findT1(_Ctx ctx, Uint8List st) {
  final order = ctx.unitOrder;
  for (var q = 0; q < order.length; q++) {
    final u = order[q];
    if (_unitSolved(ctx, st, u)) continue;
    final cs = _unitCands(ctx, st, u);
    if (cs.isEmpty) return _Ded.contra([u]);
    if (cs.length == 1) {
      final i = cs[0];
      final el = <int>[];
      final a = ctx.attackList[i];
      for (var k = 0; k < a.length; k++) {
        if (st[a[k]] == 0) el.add(a[k]);
      }
      return _Ded(1, [u], i, el);
    }
  }
  return null;
}

class _Kind {
  final int srcBase;
  final Int32List mask;
  final int tgtBase;
  const _Kind(this.srcBase, this.mask, this.tgtBase);
}

/// [out] verilirse tümünü toplar ve null döner; verilmezse ilk bulunanı döner.
_Ded? _findSets(_Ctx ctx, Uint8List st, _Masks m, int kFrom, int kTo, List<_Ded>? out) {
  final n = ctx.n;
  final kinds = [
    _Kind(2 * n, m.rowM, 0),
    _Kind(2 * n, m.colM, n),
    _Kind(0, m.regM, 2 * n),
    _Kind(n, m.regM, 2 * n),
  ];
  for (var k = kFrom; k <= kTo; k++) {
    final cl = ctx.combos[k]!;
    for (var t = 0; t < kinds.length; t++) {
      final kd = kinds[t];
      for (var ci = 0; ci < cl.length; ci++) {
        final cmb = cl[ci];
        var uni = 0, srcMask = 0;
        var ok = true;
        for (var x = 0; x < k; x++) {
          final su = kd.srcBase + cmb[x];
          if (m.solved[su] != 0) {
            ok = false;
            break;
          }
          uni |= kd.mask[su];
          srcMask |= 1 << cmb[x];
        }
        if (!ok) continue;
        final pc = _popcount(uni);
        final units = <int>[for (var x = 0; x < k; x++) kd.srcBase + cmb[x]];
        if (pc < k) {
          final cr = _Ded.contra(units);
          if (out != null) {
            out.add(cr);
            continue;
          }
          return cr;
        }
        if (pc != k) continue;
        final el = <int>[];
        var mm = uni;
        while (mm != 0) {
          final tg = _lowbit(mm);
          mm &= mm - 1;
          final tu = kd.tgtBase + tg;
          units.add(tu);
          final cells = ctx.unitCells[tu];
          for (var z = 0; z < cells.length; z++) {
            final cc = cells[z];
            if (st[cc] != 0) continue;
            final sIdx = kd.srcBase == 2 * n ? ctx.reg[cc] : (kd.srcBase == 0 ? ctx.rowOf[cc] : ctx.colOf[cc]);
            if ((srcMask & (1 << sIdx)) == 0) el.add(cc);
          }
        }
        if (el.isNotEmpty) {
          final res = _Ded(k == 1 ? 2 : (k <= 3 ? 3 : 4), units, -1, el);
          if (out != null) {
            out.add(res);
          } else {
            return res;
          }
        }
      }
    }
  }
  return null;
}

_Ded? _findT2(_Ctx ctx, Uint8List st, _Masks m, List<_Ded>? out) {
  final n = ctx.n;
  for (var g = 0; g < n; g++) {
    final u = 2 * n + g;
    if (m.solved[u] != 0) continue;
    for (var pass = 0; pass < 2; pass++) {
      final mk = pass == 0 ? m.rowM[u] : m.colM[u];
      if (_popcount(mk) != 1) continue;
      final tgt = (pass == 0 ? 0 : n) + _lowbit(mk);
      final el = <int>[];
      final cells = ctx.unitCells[tgt];
      for (var z = 0; z < cells.length; z++) {
        final cc = cells[z];
        if (st[cc] == 0 && ctx.reg[cc] != g) el.add(cc);
      }
      if (el.isNotEmpty) {
        final r1 = _Ded(2, [u, tgt], -1, el);
        if (out != null) {
          out.add(r1);
        } else {
          return r1;
        }
      }
    }
  }
  for (var u = 0; u < 2 * n; u++) {
    if (m.solved[u] != 0) continue;
    final rm = m.regM[u];
    if (_popcount(rm) != 1) continue;
    final tgt = 2 * n + _lowbit(rm);
    final el = <int>[];
    final cells = ctx.unitCells[tgt];
    for (var z = 0; z < cells.length; z++) {
      final cc = cells[z];
      if (st[cc] != 0) continue;
      if (u < n ? ctx.rowOf[cc] != u : ctx.colOf[cc] != u - n) el.add(cc);
    }
    if (el.isNotEmpty) {
      final r2 = _Ded(2, [u, tgt], -1, el);
      if (out != null) {
        out.add(r2);
      } else {
        return r2;
      }
    }
  }
  return null;
}

_Ded? _findCommonNeighbor(_Ctx ctx, Uint8List st, List<_Ded>? out) {
  final order = ctx.unitOrder;
  for (var q = 0; q < order.length; q++) {
    final u = order[q];
    if (_unitSolved(ctx, st, u)) continue;
    final cs = _unitCands(ctx, st, u);
    if (cs.length < 2) continue;
    final b0 = ctx.attackBits[cs[0]];
    var a0 = b0[0], a1 = b0[1], a2 = b0[2], a3 = b0[3];
    for (var k = 1; k < cs.length; k++) {
      final b = ctx.attackBits[cs[k]];
      a0 &= b[0];
      a1 &= b[1];
      a2 &= b[2];
      a3 &= b[3];
    }
    final el = <int>[];
    final acc = [a0, a1, a2, a3];
    for (var w = 0; w < 4; w++) {
      var mm = acc[w];
      while (mm != 0) {
        final bt = _lowbit(mm);
        mm &= mm - 1;
        final cell = (w << 5) + bt;
        if (st[cell] == 0) el.add(cell);
      }
    }
    if (el.isNotEmpty) {
      final res = _Ded(4, [u], -1, el);
      if (out != null) {
        out.add(res);
      } else {
        return res;
      }
    }
  }
  return null;
}

_Ded? _findT3(_Ctx ctx, Uint8List st, _Masks m) => _findSets(ctx, st, m, 2, 3, null);

_Ded? _findT4(_Ctx ctx, Uint8List st, _Masks m) {
  final r = _findCommonNeighbor(ctx, st, null);
  if (r != null) return r;
  return _findSets(ctx, st, m, 4, 4, null);
}

bool _hasEmptyUnit(_Ctx ctx, Uint8List st) {
  final uu = 3 * ctx.n;
  for (var u = 0; u < uu; u++) {
    final cells = ctx.unitCells[u];
    var any = false;
    for (var k = 0; k < cells.length; k++) {
      if (st[cells[k]] != 1) {
        any = true;
        break;
      }
    }
    if (!any) return true;
  }
  return false;
}

bool _t1Fix(_Ctx ctx, Uint8List st) {
  for (;;) {
    final d = _findT1(ctx, st);
    if (d == null) return false;
    if (d.contra) return true;
    _place(ctx, st, d.place);
  }
}

bool _bulkPass(_Ctx ctx, Uint8List st) {
  final m = _masks(ctx, st);
  final l1 = <_Ded>[], l2 = <_Ded>[], l3 = <_Ded>[];
  _findT2(ctx, st, m, l1);
  _findSets(ctx, st, m, 2, 4, l2);
  _findCommonNeighbor(ctx, st, l3);
  for (final list in [l1, l2, l3]) {
    for (final d in list) {
      if (d.contra) return true;
      final el = d.elim;
      for (var k = 0; k < el.length; k++) {
        if (st[el[k]] == 0) st[el[k]] = 1;
      }
    }
  }
  return _hasEmptyUnit(ctx, st);
}

bool _hypothesisFails(_Ctx ctx, Uint8List st, int i) {
  final s = Uint8List.fromList(st);
  _place(ctx, s, i);
  if (_hasEmptyUnit(ctx, s)) return true;
  for (var round = 0; round < 2; round++) {
    if (_t1Fix(ctx, s)) return true;
    if (_bulkPass(ctx, s)) return true;
  }
  return false;
}

_Ded? _findT5(_Ctx ctx, Uint8List st) {
  final best = <int>[];
  for (var i = 0; i < ctx.nn; i++) {
    if (st[i] == 0) best.add(i);
  }
  final score = Int32List(ctx.nn)..fillRange(0, ctx.nn, -1);
  final order = ctx.unitOrder;
  for (var q = 0; q < order.length; q++) {
    final cs = _unitCands(ctx, st, order[q]);
    for (var k = 0; k < cs.length; k++) {
      final sc = score[cs[k]];
      if (sc < 0 || cs.length < sc) score[cs[k]] = cs.length;
    }
  }
  best.sort((a, b) {
    final d = score[a] - score[b];
    return d != 0 ? d : a - b;
  });
  for (var z = 0; z < best.length; z++) {
    final i = best[z];
    if (_hypothesisFails(ctx, st, i)) return _Ded(5, const [], -1, [i], cell: i);
  }
  return null;
}

_Ded? _nextDeduction(_Ctx ctx, Uint8List st, int maxTech) {
  var d = _findT1(ctx, st);
  if (d != null) return d;
  if (maxTech < 2) return null;
  final m = _masks(ctx, st);
  d = _findT2(ctx, st, m, null);
  if (d != null) return d;
  if (maxTech < 3) return null;
  d = _findT3(ctx, st, m);
  if (d != null) return d;
  if (maxTech < 4) return null;
  d = _findT4(ctx, st, m);
  if (d != null) return d;
  if (maxTech < 5) return null;
  return _findT5(ctx, st);
}

int _countStones(Uint8List st) {
  var s = 0;
  for (var i = 0; i < st.length; i++) {
    if (st[i] == 2) s++;
  }
  return s;
}

// ---------------------------------------------------------------- genel API

/// Bölge metni (A, B, ...) -> n×n bölge indeksleri.
List<List<int>> parseRegions(int n, String s) => [
      for (var r = 0; r < n; r++) [for (var c = 0; c < n; c++) s.codeUnitAt(r * n + c) - 65]
    ];

/// Yalnız T1..maxTech ile çözmeyi dener. maxTech verilmez (ya da 0) ise 5.
SolveResult solveLogic(int n, List<List<int>> regions, {int? maxTech}) {
  final ctx = _getCtx(n, regions);
  final maxAllowed = (maxTech == null || maxTech == 0) ? 5 : maxTech;
  final st = Uint8List(ctx.nn);
  var steps = 0, mt = 0;
  final tc = List<int>.filled(6, 0);
  for (;;) {
    if (_countStones(st) == n) return SolveResult(true, mt < 1 ? 1 : mt, steps, tc);
    final d = _nextDeduction(ctx, st, maxAllowed);
    if (d == null || d.contra) return SolveResult(false, 6, steps, tc);
    if (d.place >= 0) _place(ctx, st, d.place);
    for (var k = 0; k < d.elim.length; k++) {
      if (st[d.elim[k]] == 0) st[d.elim[k]] = 1;
    }
    steps++;
    tc[d.tech]++;
    if (d.tech > mt) mt = d.tech;
  }
}

/// Geri izlemeli çözüm sayımı ([limit]e ulaşınca durur).
int countSolutions(int n, List<List<int>> regions, [int limit = 2]) {
  final ctx = _getCtx(n, regions);
  final regRows = Int32List(n);
  for (var i = 0; i < ctx.nn; i++) {
    regRows[ctx.reg[i]] |= 1 << ctx.rowOf[i];
  }
  var count = 0;
  final full = (1 << n) - 1;
  void rec(int r, int colUsed, int regUsed, int prevC) {
    if (r == n) {
      count++;
      return;
    }
    final rest = full & ~((1 << r) - 1);
    for (var g = 0; g < n; g++) {
      if ((regUsed & (1 << g)) == 0 && (regRows[g] & rest) == 0) return;
    }
    for (var c = 0; c < n; c++) {
      if ((colUsed & (1 << c)) != 0) continue;
      if (prevC >= 0 && (c - prevC).abs() < 2) continue;
      final g2 = ctx.reg[r * n + c];
      if ((regUsed & (1 << g2)) != 0) continue;
      rec(r + 1, colUsed | (1 << c), regUsed | (1 << g2), c);
      if (count >= limit) return;
    }
  }

  rec(0, 0, 0, -1);
  return count;
}

bool _stonesAttack(List<List<int>> regions, Pos p, Pos q) =>
    p.r == q.r ||
    p.c == q.c ||
    regions[p.r][p.c] == regions[q.r][q.c] ||
    ((p.r - q.r).abs() <= 1 && (p.c - q.c).abs() <= 1);

/// Tahta kontrolü: çakışan taşlar ve tamamlanma (V1–V5).
BoardCheck checkBoard(int n, List<List<int>> regions, List<List<int>> state) {
  final stones = <Pos>[];
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (state[r][c] == 2) stones.add(Pos(r, c));
    }
  }
  final bad = List<bool>.filled(stones.length, false);
  for (var a = 0; a < stones.length; a++) {
    for (var b = a + 1; b < stones.length; b++) {
      if (_stonesAttack(regions, stones[a], stones[b])) {
        bad[a] = true;
        bad[b] = true;
      }
    }
  }
  final conflicts = <Pos>[
    for (var a = 0; a < stones.length; a++)
      if (bad[a]) stones[a]
  ];
  return BoardCheck(conflicts, conflicts.isEmpty && stones.length == n);
}

Area _conflictArea(List<List<int>> regions, Pos p, Pos q) {
  if (p.r == q.r) return Area('row', p.r);
  if (p.c == q.c) return Area('col', p.c);
  if (regions[p.r][p.c] == regions[q.r][q.c]) return Area('region', regions[p.r][p.c]);
  return Area.cell(p);
}

Pos _rc(_Ctx ctx, int i) => Pos(ctx.rowOf[i], ctx.colOf[i]);

Hint _conflictHint(Area a, List<Pos> cells) => Hint(
    kind: 'conflict',
    tech: 0,
    area: a,
    areas: [a],
    place: const [],
    eliminate: const [],
    cells: cells,
    explainKey: 'hint_conflict');

/// Sıradaki ipucu. state: n×n, 0 boş, 1 X, 2 taş (başka değerler boş sayılır).
/// [solution] (satır başına taşın sütunu) verilirse çözümde olmayan taş ve çözüm hücresindeki X
/// da çakışma olarak döner. null: tahta tamam ya da T1–T5 ile yeni çıkarım yok.
Hint? findHint(int n, List<List<int>> regions, List<List<int>> state, [List<int>? solution]) {
  final ctx = _getCtx(n, regions);
  // 1) kural çakışması
  final stones = <Pos>[];
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (state[r][c] == 2) stones.add(Pos(r, c));
    }
  }
  for (var a = 0; a < stones.length; a++) {
    for (var b = a + 1; b < stones.length; b++) {
      final p = stones[a], q = stones[b];
      if (_stonesAttack(regions, p, q)) return _conflictHint(_conflictArea(regions, p, q), [p, q]);
    }
  }
  // 2) çözüme göre
  if (solution != null) {
    for (var k = 0; k < stones.length; k++) {
      final r = stones[k].r;
      if (r >= solution.length || solution[r] != stones[k].c) {
        return _conflictHint(Area.cell(stones[k]), [stones[k]]);
      }
    }
    for (var r = 0; r < n; r++) {
      if (r >= solution.length) continue;
      final sc = solution[r];
      if (sc >= 0 && sc < state[r].length && state[r][sc] == 1) {
        final p = Pos(r, sc);
        return _conflictHint(Area.cell(p), [p]);
      }
    }
  }
  // 3) taşların işlenmemiş etkisi
  final st = Uint8List(ctx.nn);
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      final v = state[r][c];
      st[r * n + c] = v == 2 ? 2 : (v == 1 ? 1 : 0);
    }
  }
  if (stones.length == n) return null;
  for (var k = 0; k < stones.length; k++) {
    final i = stones[k].r * n + stones[k].c;
    final el = <Pos>[];
    final at = ctx.attackList[i];
    for (var z = 0; z < at.length; z++) {
      if (st[at[z]] == 0) el.add(_rc(ctx, at[z]));
    }
    if (el.isNotEmpty) {
      final a3 = Area.cell(stones[k]);
      return Hint(
          kind: 'deduce',
          tech: 1,
          area: a3,
          areas: [a3],
          place: const [],
          eliminate: el,
          cells: [stones[k]],
          explainKey: 'hint_t1');
    }
  }
  // 4) mantık
  final d = _nextDeduction(ctx, st, 5);
  if (d == null) return null;
  if (d.contra) {
    final areasC = d.units.map((u) => _unitArea(n, u)).toList();
    return Hint(
        kind: 'conflict',
        tech: 0,
        area: areasC[0],
        areas: areasC,
        place: const [],
        eliminate: const [],
        cells: const [],
        explainKey: 'hint_conflict');
  }
  final areas = d.tech == 5 ? [Area.cell(_rc(ctx, d.cell))] : d.units.map((u) => _unitArea(n, u)).toList();
  return Hint(
    kind: 'deduce',
    tech: d.tech,
    area: areas[0],
    areas: areas,
    place: d.place >= 0 ? [_rc(ctx, d.place)] : const [],
    eliminate: d.elim.map((x) => _rc(ctx, x)).toList(),
    cells: const [],
    explainKey: 'hint_t${d.tech}',
  );
}

/// Döndürme/yansıma bağımsız bölge düzeni özeti (tekilleme).
String canonicalKey(int n, String s) {
  String? best;
  for (var t = 0; t < 8; t++) {
    final map = <int, String>{};
    var next = 0;
    final out = StringBuffer();
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var rr = r, cc = c;
        if ((t & 4) != 0) {
          final x = rr;
          rr = cc;
          cc = x;
        }
        if ((t & 1) != 0) rr = n - 1 - rr;
        if ((t & 2) != 0) cc = n - 1 - cc;
        final ch = s.codeUnitAt(rr * n + cc);
        out.write(map.putIfAbsent(ch, () => String.fromCharCode(65 + next++)));
      }
    }
    final o = out.toString();
    if (best == null || o.compareTo(best) < 0) best = o;
  }
  return '$n:$best';
}
