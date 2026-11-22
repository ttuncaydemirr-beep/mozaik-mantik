// Altın test yardımcıları (fikstürler: tools/golden.js üretir).
import 'dart:convert';
import 'dart:io';

import 'package:mozaik_core/mozaik_core.dart';

Object? loadGolden(String name) => jsonDecode(File('test/golden/$name').readAsStringSync());

String _repoFile(String rel) => File('../../$rel').readAsStringSync();

/// Depodaki gerçek seviye verisi (data/*.json).
LevelData repoData(MozaikConfig config) => LevelData.fromJsonStrings(config,
    levels: _repoFile('data/levels.json'), daily: _repoFile('data/daily.json'), tutorial: _repoFile('data/tutorial.json'));

/// toJson nesnelerini düz JSON değerlerine çevirir.
Object? norm(Object? x) => jsonDecode(jsonEncode(x));

/// tools/golden.js `compact` biçimi.
Map<String, Object?>? compactHint(int n, Hint? h) {
  if (h == null) return null;
  if (h.area != h.areas[0]) throw StateError('area != areas[0]');
  List<int> f(List<Pos> l) => [for (final p in l) p.r * n + p.c];
  return {
    'k': h.kind,
    't': h.tech,
    'a': norm(h.areas),
    'p': f(h.place),
    'e': f(h.eliminate),
    'c': f(h.cells),
    'x': h.explainKey,
  };
}

List<List<int>> gridOf(int n, String s) => [
      for (var r = 0; r < n; r++) [for (var c = 0; c < n; c++) _cellVal(s.codeUnitAt(r * n + c) - 48)]
    ];
int _cellVal(int v) => v == 3 ? 1 : v;

String cellsStr(Game g) => g.cells.join();

/// Bulmaca kimliği -> solve.json girdisi (n, regions, solution).
Map<String, Map<String, dynamic>> puzzlesById() {
  final out = <String, Map<String, dynamic>>{};
  for (final e in loadGolden('solve.json') as List) {
    final m = e as Map<String, dynamic>;
    out[m['id'] as String] = m;
  }
  return out;
}

List<int> intList(Object? x) => [for (final v in x as List) (v as num).toInt()];

class TestWallet implements HintWallet {
  num bal;
  TestWallet(this.bal);
  @override
  bool canAfford(num n) => bal >= n;
  @override
  bool spend(num n) {
    if (bal < n) return false;
    bal -= n;
    return true;
  }
}

class FakeStats implements GameStats {
  @override
  final num hints;
  @override
  final num errors;
  @override
  final num elapsed;
  final List<String> _strip;
  FakeStats(this.hints, this.errors, this.elapsed, this._strip);
  @override
  List<String> strip() => List<String>.of(_strip);
}
