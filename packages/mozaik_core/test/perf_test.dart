// Performans: 10×10 seviyelerde findHint ortalama ve en kötü süre (hedef: en kötü < 20 ms).
// Ölçülen durumlar: her 10×10 seviyenin tam çözüm izindeki tüm ara tahtalar (T5 adımları dahil).
import 'dart:io';

import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

void main() {
  test('findHint süresi (10×10)', () {
    final byId = puzzlesById();
    final cases = <(int, List<List<int>>, List<List<int>>, List<int>)>[];
    for (final file in ['levels', 'daily']) {
      for (final t in (loadGolden('trace_$file.json') as List).cast<Map<String, dynamic>>()) {
        final p = byId[t['id']]!;
        if (p['n'] != 10) continue;
        final rg = parseRegions(10, p['regions'] as String);
        final sol = intList(p['solution']);
        cases.add((10, rg, gridOf(10, '0' * 100), sol));
        for (final st in (t['steps'] as List).cast<Map<String, dynamic>>()) {
          cases.add((10, rg, gridOf(10, st['s'] as String), sol));
        }
      }
    }
    // ısınma (JIT)
    for (final c in cases) {
      findHint(c.$1, c.$2, c.$3, c.$4);
    }
    final sw = Stopwatch();
    var worst = 0.0, total = 0.0;
    var worstTech = -1;
    for (final c in cases) {
      sw
        ..reset()
        ..start();
      final h = findHint(c.$1, c.$2, c.$3, c.$4);
      sw.stop();
      final ms = sw.elapsedMicroseconds / 1000.0;
      total += ms;
      if (ms > worst) {
        worst = ms;
        worstTech = h?.tech ?? -1;
      }
    }
    final avg = total / cases.length;
    stdout.writeln('[PERF] findHint 10x10: durum=${cases.length} ortalama=${avg.toStringAsFixed(3)} ms '
        'en_kotu=${worst.toStringAsFixed(3)} ms (tech $worstTech) hedef<20 ms: ${worst < 20 ? 'GECTI' : 'KALDI'}');
    expect(worst, lessThan(20));
  });
}
