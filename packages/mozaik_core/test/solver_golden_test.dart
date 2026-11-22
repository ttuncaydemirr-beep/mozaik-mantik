// (a) solveLogic/countSolutions, (b) tam çözüm izi, (c) rastgele tahtalarda findHint — JS ile birebir.
import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

void main() {
  final solve = (loadGolden('solve.json') as List).cast<Map<String, dynamic>>();
  final byId = puzzlesById();

  group('(a) solveLogic + countSolutions', () {
    test('kapsam: 300 seviye + 400 günlük + 3 öğretici', () {
      expect(solve.length, 703);
    });
    for (final e in solve) {
      test(e['id'], () {
        final n = e['n'] as int;
        final regions = e['regions'] as String;
        final rg = parseRegions(n, regions);
        final s = solveLogic(n, rg);
        expect(s.solved, e['solved']);
        expect(s.maxTech, e['maxTech']);
        expect(s.steps, e['steps']);
        expect(s.techCounts, intList(e['techCounts']));
        expect(countSolutions(n, rg), e['count']);
        expect(countSolutions(n, rg, 5), e['count5']);
        expect(canonicalKey(n, regions), e['canon']);
      });
    }
  });

  for (final file in ['levels', 'daily', 'tutorial']) {
    final traces = (loadGolden('trace_$file.json') as List).cast<Map<String, dynamic>>();
    group('(b) çözüm izi: $file', () {
      for (final t in traces) {
        test(t['id'], () {
          final p = byId[t['id']]!;
          final n = p['n'] as int;
          final g = Game(
              n: n,
              regions: p['regions'] as String,
              solution: intList(p['solution']),
              settings: GameSettings(autoX: t['autoX'] as bool));
          final steps = t['steps'] as List;
          for (var k = 0; k < steps.length; k++) {
            final st = steps[k] as Map<String, dynamic>;
            final h = g.getHint();
            expect(compactHint(n, h), st['h'], reason: 'adım $k ipucu');
            g.applyHint(h!);
            expect(cellsStr(g), st['s'], reason: 'adım $k tahta');
          }
          expect(g.getHint(), isNull);
          expect(g.isComplete(), t['complete']);
          expect(norm(g.log), t['log']);
          expect(g.strip(), t['strip']);
        });
      }
    });
  }

  final cases = (loadGolden('hints_random.json') as List).cast<Map<String, dynamic>>();
  group('(c) rastgele oyuncu tahtaları', () {
    test('kapsam >= 2000', () {
      expect(cases.length, greaterThanOrEqualTo(2000));
    });
    const chunk = 100;
    for (var a = 0; a < cases.length; a += chunk) {
      final b = a + chunk < cases.length ? a + chunk : cases.length;
      test('durum $a..${b - 1}', () {
        for (var q = a; q < b; q++) {
          final c = cases[q];
          final p = byId[c['id']]!;
          final n = p['n'] as int;
          final rg = parseRegions(n, p['regions'] as String);
          final grid = gridOf(n, c['s'] as String);
          expect(compactHint(n, findHint(n, rg, grid, intList(p['solution']))), c['sol'], reason: '#$q solution ile');
          expect(compactHint(n, findHint(n, rg, grid)), c['nosol'], reason: '#$q parametresiz');
          final chk = checkBoard(n, rg, grid);
          expect([for (final x in chk.conflicts) x.r * n + x.c], (c['chk'] as Map)['c'], reason: '#$q checkBoard');
          expect(chk.complete, (c['chk'] as Map)['ok'], reason: '#$q complete');
        }
      });
    }
  });
}
