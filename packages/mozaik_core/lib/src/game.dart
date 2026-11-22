// Oyun mantığı (web/src/logic.js birebir): tahta durumu, dokunma döngüsü, sürükleme, otomatik X,
// geri al/ileri al, çakışma, ipucu akışı (aşama maliyetleri 1 / 0 / 1, tam ipucu 2 hak), kayıt.
// Hücre durumları: 0 boş, 1 X (elle), 2 taş, 3 otomatik X. Çözücüye giderken 3 -> 1.
import 'dart:convert';
import 'dart:typed_data';

import 'js_compat.dart';
import 'solver.dart';

const int cellEmpty = 0;
const int cellX = 1;
const int cellStone = 2;
const int cellAuto = 3;

/// Yıldız ölçütü (kurallar 3.6; süre etkilemez).
int stars(num hints, num errors) => (hints == 0 && errors == 0) ? 3 : (hints <= 1 && errors <= 2) ? 2 : 1;

/// İpucu harcama arayüzü (Economy bunu uygular).
abstract class HintWallet {
  bool canAfford(num n);
  bool spend(num n);
}

/// Bitmiş oyunun ilerleme kaydına giden özeti.
abstract class GameStats {
  num get hints;
  num get errors;
  num get elapsed;
  List<String> strip();
}

class GameSettings {
  bool autoX;
  bool quickStone;
  GameSettings({this.autoX = true, this.quickStone = false});
}

/// Konulan taş kaydı: i hücre, h ipucuyla kondu, x çakışma yarattı.
class LogEntry {
  final int i;
  final bool h;
  bool x;
  LogEntry(this.i, this.h, this.x);
  LogEntry copy() => LogEntry(i, h, x);
  Map<String, Object?> toJson() => {'i': i, 'h': h, 'x': x};
}

class _Snap {
  final Uint8List c;
  final List<LogEntry> l;
  _Snap(this.c, this.l);
}

class TapResult {
  bool changed = false;
  bool placed = false;
  bool bad = false;
  List<Area> areas = const [];

  /// Yalnız tap() doldurur (öğretici yönlendirmesi); longPress'te null.
  bool? guided;
  TapResult({this.guided});
  Map<String, Object?> toJson() => {
        'changed': changed,
        'placed': placed,
        'bad': bad,
        'areas': areas.map((a) => a.toJson()).toList(),
        if (guided != null) 'guided': guided,
      };
}

/// hintPress dönüşü. status: none | nothing | need-ad | stage1 | stage2 | applied
class HintPressResult {
  final String status;
  final bool? changed;
  const HintPressResult(this.status, [this.changed]);
  Map<String, Object?> toJson() => {'status': status, if (changed != null) 'changed': changed};
}

/// Açık ipucu: stage 1 (alan), 2 (açıklama); 3. basış uygular.
class OpenHint {
  int stage;
  Hint h;
  final String sig;
  OpenHint(this.stage, this.h, this.sig);
}

class _Drag {
  final String? mode;
  final _Snap before;
  _Drag(this.mode, this.before);
}

String _sigOf(Hint h) => jsonEncode([
      h.kind,
      h.area.toJson(),
      h.place.map((p) => p.toJson()).toList(),
      h.eliminate.map((p) => p.toJson()).toList(),
    ]);

class Game implements GameStats {
  final int n;
  final String regionsStr;
  final List<int>? solution;
  final List<List<int>> rg;
  Uint8List cells;
  List<_Snap> _undo = [];
  List<_Snap> _redo = [];
  List<LogEntry> log = [];
  @override
  num hints = 0;
  @override
  num errors = 0;
  @override
  num elapsed = 0;
  bool won = false;
  final GameSettings settings;

  /// level | daily | tutorial
  final String mode;
  _Drag? _drag;
  BoardCheck? _chk;
  OpenHint? hint;
  String? paidSig;
  final int? tutFirst;
  int _lastBad = -1;

  Game({
    required this.n,
    required String regions,
    this.solution,
    GameSettings? settings,
    this.mode = 'level',
    this.tutFirst,
  })  : regionsStr = regions,
        rg = parseRegions(n, regions),
        cells = Uint8List(n * n),
        settings = settings ?? GameSettings();

  int get undoDepth => _undo.length;
  int get redoDepth => _redo.length;

  int idx(int r, int c) => r * n + c;
  Pos rc(int i) => Pos(i ~/ n, i % n);
  int regionAt(int i) => rg[i ~/ n][i % n];

  List<List<int>> stateGrid() => [
        for (var r = 0; r < n; r++)
          [
            for (var c = 0; c < n; c++) cells[r * n + c] == cellAuto ? cellX : cells[r * n + c],
          ]
      ];

  List<int> stones() => [
        for (var i = 0; i < cells.length; i++)
          if (cells[i] == cellStone) i
      ];

  bool attacks(int a, int b) {
    if (a == b) return false;
    final ar = a ~/ n, ac = a % n, br = b ~/ n, bc = b % n;
    final dr = (ar - br).abs(), dc = (ac - bc).abs();
    return ar == br || ac == bc || regionAt(a) == regionAt(b) || (dr > dc ? dr : dc) < 2;
  }

  List<int> attackedCells(int i) => [
        for (var j = 0; j < cells.length; j++)
          if (attacks(i, j)) j
      ];

  BoardCheck check() => _chk ??= checkBoard(n, rg, stateGrid());

  Set<int> conflictSet() => {for (final p in check().conflicts) p.r * n + p.c};

  bool isComplete() => check().complete;

  /// Çakışmanın nedeni olan alanlar (parlatma için).
  List<Area> reasonsFor(int i) {
    final out = <Area>[];
    final r = i ~/ n, c = i % n;
    final seen = <String>{};
    void add(String t, int ix) {
      if (seen.add('$t$ix')) out.add(Area(t, ix));
    }

    for (final j in stones()) {
      if (j == i) continue;
      final jr = j ~/ n, jc = j % n;
      if (jr == r) add('row', r);
      if (jc == c) add('col', c);
      if (regionAt(j) == regionAt(i)) add('region', regionAt(i));
      final dr = (jr - r).abs(), dc = (jc - c).abs();
      if ((dr > dc ? dr : dc) < 2) add('nbr', i);
    }
    return out;
  }

  List<int> areaCells(Area? area) {
    if (area == null) return [];
    if (area.type == 'cell') return [area.cell!.r * n + area.cell!.c];
    final o = <int>[];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if ((area.type == 'row' && r == area.index) ||
            (area.type == 'col' && c == area.index) ||
            (area.type == 'region' && rg[r][c] == area.index)) {
          o.add(r * n + c);
        }
      }
    }
    return o;
  }

  // --- Geçmiş
  _Snap _snap() => _Snap(Uint8List.fromList(cells), [for (final e in log) e.copy()]);
  void _restoreSnap(_Snap s) {
    cells = Uint8List.fromList(s.c);
    log = [for (final e in s.l) e.copy()];
    _chk = null;
  }

  bool _commit(_Snap before) {
    var same = true;
    for (var i = 0; i < cells.length; i++) {
      if (before.c[i] != cells[i]) {
        same = false;
        break;
      }
    }
    if (same) return false;
    _undo.add(before);
    _redo = [];
    _chk = null;
    revalidateHint();
    return true;
  }

  bool undo() {
    if (_undo.isEmpty || won) return false;
    _redo.add(_snap());
    _restoreSnap(_undo.removeLast());
    revalidateHint();
    return true;
  }

  bool redo() {
    if (_redo.isEmpty || won) return false;
    _undo.add(_snap());
    _restoreSnap(_redo.removeLast());
    revalidateHint();
    return true;
  }

  bool canUndo() => _undo.isNotEmpty && !won;
  bool canRedo() => _redo.isNotEmpty && !won;

  // --- Hücre yazma (tek nokta)
  void _set(int i, int v, {bool hintFlag = false, bool noCount = false}) {
    final old = cells[i];
    if (old == v) return;
    cells[i] = v;
    _chk = null;
    if (old == cellStone) {
      log = log.where((e) => e.i != i).toList();
      _recomputeAuto();
    }
    if (v == cellStone) {
      final entry = LogEntry(i, hintFlag, false);
      log.add(entry);
      if (settings.autoX) {
        final att = attackedCells(i);
        for (var k = 0; k < att.length; k++) {
          if (cells[att[k]] == cellEmpty) cells[att[k]] = cellAuto;
        }
      }
      final chk = check();
      final r = i ~/ n, c = i % n;
      var bad = false;
      for (final p in chk.conflicts) {
        if (p.r == r && p.c == c) bad = true;
      }
      if (!bad && reasonsFor(i).isNotEmpty) bad = true;
      if (bad) {
        entry.x = true;
        if (!noCount) errors++;
        _lastBad = i;
      }
    }
  }

  void _recomputeAuto() {
    final st = stones();
    for (var i = 0; i < cells.length; i++) {
      if (cells[i] == cellAuto) {
        var keep = false;
        for (var j = 0; j < st.length; j++) {
          if (attacks(st[j], i)) {
            keep = true;
            break;
          }
        }
        if (!keep) cells[i] = cellEmpty;
      }
    }
  }

  // --- Dokunma
  int? nextTutorialTarget() {
    if (tutFirst != null && cells[tutFirst!] != cellStone && stones().isEmpty) return tutFirst;
    final sol = solution;
    if (sol == null) return null;
    for (var r = 0; r < n; r++) {
      final i = r * n + sol[r];
      if (cells[i] != cellStone) return i;
    }
    return null;
  }

  TapResult tap(int r, int c) {
    final i = idx(r, c);
    final res = TapResult(guided: false);
    if (won) return res;
    if (mode == 'tutorial') {
      final tg = nextTutorialTarget();
      if (i != tg) {
        res.guided = true;
        return res;
      }
      final b0 = _snap();
      _set(i, cellStone, noCount: true);
      res.changed = _commit(b0);
      res.placed = true;
      return res;
    }
    final before = _snap();
    final v = cells[i];
    int nv;
    if (settings.quickStone) {
      nv = v == cellEmpty ? cellStone : (v == cellStone ? cellX : cellEmpty);
    } else {
      nv = v == cellEmpty ? cellX : ((v == cellX || v == cellAuto) ? cellStone : cellEmpty);
    }
    _lastBad = -1;
    _set(i, nv);
    res.changed = _commit(before);
    if (nv == cellStone) {
      res.placed = true;
      if (_lastBad == i) {
        res.bad = true;
        res.areas = reasonsFor(i);
      }
    }
    return res;
  }

  TapResult longPress(int r, int c) {
    final i = idx(r, c);
    final res = TapResult();
    if (won || mode == 'tutorial') return res;
    final before = _snap();
    _lastBad = -1;
    _set(i, cells[i] == cellStone ? cellEmpty : cellStone);
    res.changed = _commit(before);
    if (cells[i] == cellStone) {
      res.placed = true;
      if (_lastBad == i) {
        res.bad = true;
        res.areas = reasonsFor(i);
      }
    }
    return res;
  }

  // --- Sürükleme (tek geri al adımı; taşa dokunmaz). Dönüş: 'add' | 'erase' | null
  String? dragBegin(int r, int c) {
    if (won || mode == 'tutorial') return null;
    final v = cells[idx(r, c)];
    final m = v == cellEmpty ? 'add' : ((v == cellX || v == cellAuto) ? 'erase' : null);
    _drag = _Drag(m, _snap());
    return m;
  }

  bool dragOver(int r, int c) {
    final d = _drag;
    if (d == null || d.mode == null) return false;
    final i = idx(r, c), v = cells[i];
    if (d.mode == 'add' && v == cellEmpty) {
      cells[i] = cellX;
      _chk = null;
      return true;
    }
    if (d.mode == 'erase' && (v == cellX || v == cellAuto)) {
      cells[i] = cellEmpty;
      _chk = null;
      return true;
    }
    return false;
  }

  bool dragEnd() {
    final d = _drag;
    _drag = null;
    if (d == null || d.mode == null) return false;
    return _commit(d.before);
  }

  void dragCancel() {
    final d = _drag;
    _drag = null;
    if (d != null) {
      cells = Uint8List.fromList(d.before.c);
      _chk = null;
    }
  }

  // --- İpucu
  Hint? getHint() => findHint(n, rg, stateGrid(), solution);

  /// Aşama 3: çıkarımı tahtaya işle (tek geri al adımı).
  bool applyHint(Hint h) {
    final before = _snap();
    if (h.kind == 'conflict') {
      final target = _conflictTarget(h);
      if (target != null) _set(target, cellEmpty);
    } else {
      for (final p in h.eliminate) {
        final i = p.r * n + p.c;
        if (cells[i] == cellEmpty) cells[i] = cellX;
      }
      for (final p in h.place) {
        _set(p.r * n + p.c, cellStone, hintFlag: true, noCount: true);
      }
    }
    _chk = null;
    return _commit(before);
  }

  int? _conflictTarget(Hint h) {
    var cs = h.cells.isNotEmpty ? [for (final p in h.cells) p.r * n + p.c] : <int>[];
    if (cs.isEmpty && h.area.type == 'cell') cs = [h.area.cell!.r * n + h.area.cell!.c];
    if (cs.isEmpty) cs = [for (final p in check().conflicts) p.r * n + p.c];
    final sol = solution;
    if (sol != null) {
      final wrong = cs.where((i) => cells[i] == cellStone && sol[i ~/ n] != i % n).toList();
      if (wrong.isNotEmpty) return wrong[0];
      final wx = cs.where((i) => (cells[i] == cellX || cells[i] == cellAuto) && sol[i ~/ n] == i % n).toList();
      if (wx.isNotEmpty) return wx[0];
      final st = stones().where((i) => sol[i ~/ n] != i % n).toList();
      final inCells = st.where(cs.contains).toList();
      if (inCells.isNotEmpty) return inCells[0];
      if (st.isNotEmpty) return st[0];
    }
    return cs.isNotEmpty ? cs[0] : null;
  }

  void revalidateHint() {
    final open = hint;
    if (open == null) return;
    final h = getHint();
    if (h == null || _sigOf(h) != open.sig) {
      hint = null;
    } else {
      open.h = h;
    }
  }

  int hintStage() => hint?.stage ?? 0;

  /// Sıradaki basışın maliyeti (hak).
  int hintNextCost() {
    final open = hint;
    if (open != null) return open.stage == 1 ? 0 : 1;
    if (paidSig != null) {
      final h = getHint();
      if (h != null && _sigOf(h) == paidSig) return 0;
    }
    return 1;
  }

  HintPressResult hintPress(HintWallet eco) {
    if (won || mode == 'tutorial') return const HintPressResult('none');
    final cost = hintNextCost();
    final open = hint;
    if (open == null) {
      final h = getHint();
      if (h == null) return const HintPressResult('nothing');
      if (cost > 0) {
        if (!eco.canAfford(cost)) return const HintPressResult('need-ad');
        eco.spend(cost);
        hints++;
        paidSig = _sigOf(h);
      }
      hint = OpenHint(1, h, _sigOf(h));
      return const HintPressResult('stage1');
    }
    if (open.stage == 1) {
      open.stage = 2;
      return const HintPressResult('stage2');
    }
    if (!eco.canAfford(1)) return const HintPressResult('need-ad');
    eco.spend(1);
    final hh = open.h;
    hint = null;
    paidSig = null;
    return HintPressResult('applied', applyHint(hh));
  }

  // --- Kayıt (web ile aynı JSON: c, l, u, r, e, h, x)
  Map<String, Object?> serialize() {
    String enc(Uint8List c) => c.join();
    List<Map<String, Object?>> logJ(List<LogEntry> l) => [for (final e in l) e.toJson()];
    return {
      'c': enc(cells),
      'l': logJ(log),
      'u': [
        for (final s in _undo) {'c': enc(s.c), 'l': logJ(s.l)}
      ],
      'r': [
        for (final s in _redo) {'c': enc(s.c), 'l': logJ(s.l)}
      ],
      'e': (elapsed + 0.5).floor(),
      'h': hints,
      'x': errors,
    };
  }

  /// Bozuk kayıtta [FormatException] fırlatır (web: Error('bad-save')); durum değişmez.
  void restore(Object? o) {
    final n2 = n * n;
    Uint8List dec(Object? s) {
      if (s is! String || s.length != n2) throw const FormatException('bad-save');
      final a = Uint8List(s.length);
      for (var i = 0; i < s.length; i++) {
        final v = jsToNumber(s[i]);
        if (!(v >= 0 && v <= 3)) throw const FormatException('bad-save');
        a[i] = v.toInt();
      }
      return a;
    }

    List<LogEntry> logOf(Object? l) {
      if (l is! List) return [];
      final out = <LogEntry>[];
      for (final e in l) {
        if (!jsTruthy(e) || e is! Map) continue;
        final i = e['i'];
        // Not: web tam sayı olmayan i değerini de kabul eder; Dart tam sayı olmayanı atar (yalnız bozuk kayıt).
        if (i is num && i >= 0 && i < n2 && i == i.truncate()) {
          out.add(LogEntry(i.toInt(), jsTruthy(e['h']), jsTruthy(e['x'])));
        }
      }
      return out;
    }

    if (o is! Map) throw const FormatException('bad-save');
    final c2 = dec(o['c']);
    final lg = logOf(o['l']);
    List<_Snap> stack(Object? x) {
      if (x is! List) return [];
      return [
        for (final s in x)
          if (s is Map) _Snap(dec(s['c']), logOf(s['l'])) else throw const FormatException('bad-save')
      ];
    }

    final u = stack(o['u']);
    final r = stack(o['r']);
    cells = c2;
    log = lg;
    _undo = u;
    _redo = r;
    final e = jsToNumber(o['e']), h = jsToNumber(o['h']), x = jsToNumber(o['x']);
    elapsed = e > 0 ? e : 0;
    hints = h > 0 ? h : 0;
    errors = x > 0 ? x : 0;
    _chk = null;
  }

  /// Paylaşım şeridi: konulma sırasıyla 'h' ipucu, 'x' çakışma, 'c' temiz.
  @override
  List<String> strip() => [for (final e in log) e.h ? 'h' : (e.x ? 'x' : 'c')];
}
