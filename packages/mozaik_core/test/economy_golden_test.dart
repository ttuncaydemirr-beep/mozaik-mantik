// (d) ekonomi / reklam sayaçları / ilerleme olay dizileri — JS ile birebir.
import 'dart:convert';

import 'package:mozaik_core/mozaik_core.dart';
import 'package:test/test.dart';

import 'support.dart';

int isoToMs(String iso, int h) {
  final p = parseIso(iso);
  return DateTime.utc(p.y, p.m, p.d, h).millisecondsSinceEpoch;
}

Map<String, Object?> summary(SaveState s) {
  final d = s.data;
  final daily = d['daily'] as Map<String, dynamic>;
  return {
    'hints': d['hints'],
    'ads': d['ads'],
    'daily': {
      'streak': daily['streak'],
      'lastDay': daily['lastDay'],
      'shields': daily['shields'],
      'broken': daily['broken'],
      'lastRescueDay': daily['lastRescueDay'],
      'done': (daily['done'] as Map).length,
    },
    'levels': s.levels.length,
    'gallery': d['gallery'],
    'purchase': s.purchase(),
  };
}

void main() {
  final all = (loadGolden('economy.json') as List).cast<Map<String, dynamic>>();
  group('(d) ekonomi senaryoları', () {
    for (var q = 0; q < all.length; q++) {
      final sc = all[q];
      test('senaryo $q (${sc['special'] ?? 'rastgele'}, ayar ${jsonEncode(sc['override'])})', () {
        final config = MozaikConfig(sc['override'] as Map?);
        final store = MemoryKeyValueStore();
        final state = SaveState(store, config)..load();
        final daily = Daily(config);
        final eco = Economy(state, config, daily);
        final data = repoData(config);
        final clock = FixedClock(DateTime.utc(2026));
        final progress = Progress(state, config, data, eco, daily, clock);
        var today = sc['t0'] as String;
        var now = sc['now0'] as int;
        final ops = sc['ops'] as List;
        for (var k = 0; k < ops.length; k++) {
          final rec = ops[k] as Map<String, dynamic>;
          final op = rec['op'] as List;
          clock.current = DateTime.fromMillisecondsSinceEpoch(now, isUtc: true);
          Object? ret;
          switch (op[0] as String) {
            case 'day':
              today = addDays(today, op[1] as int);
              now = isoToMs(today, 7) + (op[2] as int) * 1000;
            case 'wait':
              now += (op[1] as int) * 1000;
            case 'dailyLogin':
              ret = eco.dailyLogin(today);
            case 'evaluate':
              ret = daily.evaluate(state.daily, today);
              state.save();
            case 'spend':
              ret = eco.spend(op[1] as int);
            case 'canAfford':
              ret = eco.canAfford(op[1] as int);
            case 'grant':
              ret = eco.grant(op[1] as int);
            case 'dailyPuzzleDone':
              ret = eco.onDailyPuzzleDone();
            case 'rewardedHintsLeft':
              ret = eco.rewardedHintsLeft(today);
            case 'canWatch':
              ret = eco.canWatch(op[1] as String, today);
            case 'giftAvailable':
              ret = eco.giftAvailable(today);
            case 'finishRewarded':
              ret = eco.finishRewarded(op[1] as String, op[2] as bool, now, today);
            case 'completeLevel':
              ret = progress.completeLevel(
                  data.level(op[1] as String)!, FakeStats(op[2] as int, op[3] as int, op[4] as int, const []));
            case 'completeDaily':
              ret = progress.completeDaily(
                  today, FakeStats(op[1] as int, op[2] as int, op[3] as int, (op[4] as List).cast<String>()));
            case 'interstitial':
              final d = eco.interstitialDecision(now, op[1] as bool, today);
              if (d.show && (op[2] as bool)) eco.markInterstitialShown(now);
              ret = d;
            case 'removeAds':
              ret = eco.removeAds(today);
            case 'restore':
              ret = eco.restore();
            case 'packLock':
              ret = progress.packLock(op[1] as int, op[2] as bool);
            case 'packStats':
              ret = progress.packStats(op[1] as String);
            case 'unique':
              ret = eco.uniqueCompleted();
            case 'canRescue':
              ret = daily.canRescue(state.daily, today);
            case 'checkGallery':
              ret = progress.checkGallery();
            case 'reload':
              state.save();
              state.load();
            case 'reset':
              state.reset();
            default:
              fail('bilinmeyen işlem ${op[0]}');
          }
          final why = 'adım $k ${jsonEncode(op)}';
          expect(today, rec['t'], reason: '$why gün');
          expect(now, rec['now'], reason: '$why saat');
          expect(norm(ret), rec['ret'], reason: '$why dönüş');
          expect(norm(summary(state)), rec['s'], reason: '$why durum');
        }
        state.save();
        expect(norm(state.data), sc['final']);
        expect(jsonDecode(store.values[SaveState.saveKey]!), sc['stored']);
      });
    }
  });
}
