// (f) paylaşım metni, (g) yıldız tablosu, kayıt göçü (migrate) ve Game.restore — JS ile birebir.
import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

void main() {
  final config = MozaikConfig();

  test('(f) paylaşım metni (8 dil)', () {
    final share = Share(config);
    final cases = (loadGolden('share.json') as List).cast<Map<String, dynamic>>();
    expect(cases.map((c) => c['lang']).toSet(), config.languages.toSet());
    for (final c in cases) {
      final o = c['o'] as Map<String, dynamic>;
      expect(c['rtl'], config.isRtl(c['lang'] as String));
      final text = share.build(ShareInput(
        dayNo: o['dayNo'] as int,
        time: o['time'] as int,
        hints: o['hints'] as int,
        errors: o['errors'] as int,
        stars: o['stars'] as int,
        streak: o['streak'] as int,
        strip: (o['strip'] as List).cast<String>(),
        rtl: c['rtl'] as bool,
      ));
      expect(text, c['text'], reason: '${c['lang']} $o');
    }
  });

  test('(g) yıldız tablosu', () {
    for (final r in (loadGolden('stars.json') as List).cast<List>()) {
      expect(stars(r[0] as int, r[1] as int), r[2], reason: '$r');
    }
  });

  final save = loadGolden('save.json') as Map<String, dynamic>;
  test('kayıt varsayılanları', () {
    expect(norm(SaveState.defaults(config)), save['defaults']);
  });
  test('kayıt göçü: bozuk/eksik alanlar (${(save['migrate'] as List).length} durum)', () {
    for (final c in (save['migrate'] as List).cast<Map<String, dynamic>>()) {
      final raw = c['raw'] as String;
      final store = MemoryKeyValueStore();
      if (raw.isNotEmpty) store.values[SaveState.saveKey] = raw;
      final s = SaveState(store, config);
      expect(norm(s.load()), c['out'], reason: raw);
    }
  });
  test('satın alma kaydı', () {
    for (final c in (save['purchase'] as List).cast<Map<String, dynamic>>()) {
      final raw = c['raw'] as String;
      final store = MemoryKeyValueStore();
      if (raw.isNotEmpty) store.values[SaveState.purchaseKey] = raw;
      expect(norm(SaveState(store, config).purchase()), c['out'], reason: raw);
    }
  });
  test('Game.restore: bozuk girdiler', () {
    final r = save['restore'] as Map<String, dynamic>;
    final p = puzzlesById()[r['level']]!;
    for (final c in (r['cases'] as List).cast<Map<String, dynamic>>()) {
      final g = Game(n: p['n'] as int, regions: p['regions'] as String, solution: intList(p['solution']));
      if (c['ok'] as bool) {
        g.restore(c['in']);
        expect(norm(g.serialize()), c['out'], reason: '${c['in']}');
      } else {
        expect(() => g.restore(c['in']), throwsFormatException, reason: '${c['in']}');
        expect(g.cells.every((v) => v == 0), isTrue);
      }
    }
  });
}
