// (e) günlük: tarih -> gün#, dow, seçim; Türkiye gece yarısı; seri senaryoları — JS ile birebir.
import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

void main() {
  final g = loadGolden('daily.json') as Map<String, dynamic>;
  final config = MozaikConfig();
  final daily = Daily(config);
  final dailyPI = Daily(MozaikConfig({
    'daily': {'selectMode': 'poolIndex'}
  }));
  final data = repoData(config);
  final pool = data.daily;
  final noDow = [for (final p in pool) p.copyWith(clearDow: true)];
  final onlyCirak = data.packs['cirak']!;

  test('gün -> gün#, haftanın günü, zorluk, seçim (${(g['days'] as List).length} gün)', () {
    expect(pool.length, 400);
    for (final e in (g['days'] as List).cast<Map<String, dynamic>>()) {
      final d = e['d'] as String;
      expect(daily.dayNumber(d), e['no'], reason: d);
      expect(weekday(d), e['wd'], reason: d);
      expect(daily.targetDiff(d), e['diff'], reason: d);
      expect(daily.pick(pool, d)!.id, e['pick'], reason: d);
      expect(daily.pick(noDow, d)!.id, e['pickNoDow'], reason: d);
      expect(daily.pick(onlyCirak, d)!.id, e['pickCirak'], reason: d);
      expect(dailyPI.pick(pool, d)!.id, e['pickPI'], reason: d);
      expect(dayIndex(d), e['idx'], reason: d);
      expect(daysInMonth(int.parse(d.substring(0, 4)), int.parse(d.substring(5, 7))), e['dim'], reason: d);
    }
  });

  test('Türkiye saat dilimi (UTC+3) gece yarısı sınırları', () {
    const tr = Duration(hours: 3);
    for (final e in (g['tz'] as List).cast<Map<String, dynamic>>()) {
      final t = DateTime.fromMillisecondsSinceEpoch(e['ms'] as int, isUtc: true);
      final iso = localDateIso(t, utcOffset: tr);
      expect(iso, e['iso'], reason: '${e['ms']}');
      expect(todayIso(FixedClock(t), utcOffset: tr), e['iso']);
      expect(msToMidnight(t, utcOffset: tr), e['toMid'], reason: '${e['ms']}');
      expect(daily.dayNumber(iso), e['day']);
      expect(daily.pick(pool, iso)!.id, e['pick']);
    }
  });

  group('seri senaryoları', () {
    final streaks = (g['streaks'] as List).cast<Map<String, dynamic>>();
    final alt = Daily(MozaikConfig({
      'daily': {'shieldEvery': 3, 'shieldMax': 1},
      'ads': {'streakRescueWeeklyMax': 2},
    }));
    for (var s = 0; s < streaks.length; s++) {
      final sc = streaks[s];
      test('seri $s', () {
        final dd = sc['cfg'] == 1 ? alt : daily;
        final d = SaveState.defaults(config)['daily'] as Map<String, dynamic>;
        var today = sc['start'] as String;
        final ops = sc['ops'] as List;
        for (var i = 0; i < ops.length; i++) {
          final rec = ops[i] as Map<String, dynamic>;
          final op = rec['op'] as List;
          Object? ret;
          switch (op[0] as String) {
            case 'day':
              today = addDays(today, op[1] as int);
            case 'evaluate':
              ret = dd.evaluate(d, today);
            case 'complete':
              ret = dd.complete(d, today, <String, dynamic>{
                'time': 1000 * (i + 1),
                'hints': op[1],
                'errors': op[2],
                'stars': stars(op[1] as int, op[2] as int),
                'strip': ['c', 'h'],
                'at': 1700000000000 + i,
              });
            case 'canRescue':
              ret = dd.canRescue(d, today);
            case 'rescue':
              ret = dd.rescue(d, today);
            case 'isDone':
              ret = dd.isDone(d, today);
          }
          final snap = norm(d) as Map<String, dynamic>;
          final keys = (d['done'] as Map).keys.toList();
          snap['done'] = keys.length;
          snap['lastDone'] = keys.isEmpty ? null : keys.last;
          expect(today, rec['t'], reason: 'adım $i');
          expect(norm(ret), rec['ret'], reason: 'adım $i ${op[0]}');
          expect(snap, rec['d'], reason: 'adım $i ${op[0]} durum');
        }
        expect(norm(d), sc['final']);
      });
    }
  });

  test('ay panosu ve yardımcılar', () {
    for (final m in (g['months'] as List).cast<Map<String, dynamic>>()) {
      expect(norm(daily.monthInfo(m['t'] as String)), m['info']);
    }
    final misc = g['misc'] as Map<String, dynamic>;
    expect(config.daily['epoch'], misc['epoch']);
    for (final a in (misc['addDays'] as List).cast<List>()) {
      expect(addDays(a[0] as String, a[1] as int), a[2]);
    }
    for (final a in (misc['fmtTime'] as List).cast<List>()) {
      expect(fmtTime(a[0] as int), a[1]);
      expect(fmtClock(a[0] as int), a[2]);
    }
  });
}
