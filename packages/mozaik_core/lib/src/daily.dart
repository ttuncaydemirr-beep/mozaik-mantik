// Günlük bulmaca: gün numarası, seçim, seri, seri koruma/kurtarma (web/src/daily.js birebir).
// Seri verisi kayıttaki `daily` nesnesidir: { done, streak, lastDay, shields, broken, lastRescueDay }.
import 'config.dart';
import 'js_compat.dart';
import 'levels.dart';
import 'util.dart';

const Map<String, int> _packIdx = {'cirak': 1, 'kalfa': 2, 'usta': 3, 'basusta': 4, 'nakkas': 5};

class SeriesEvaluation {
  final int protectedDays;
  final bool broken;
  const SeriesEvaluation(this.protectedDays, this.broken);
  Map<String, Object?> toJson() => {'protectedDays': protectedDays, 'broken': broken};
}

class DailyCompleteResult {
  final bool first;
  final Map<String, dynamic> record;

  /// Yalnız ilk tamamlamada dolu (web'de ilk olmayanda alan yok).
  final bool? shield;
  const DailyCompleteResult(this.first, this.record, [this.shield]);
  Map<String, Object?> toJson() => {'first': first, 'record': record, if (shield != null) 'shield': shield};
}

class MonthInfo {
  final int y;
  final int m;
  final List<String> days;
  const MonthInfo(this.y, this.m, this.days);
  Map<String, Object?> toJson() => {'y': y, 'm': m, 'days': days};
}

class Daily {
  final MozaikConfig config;
  const Daily(this.config);

  static const List<String> dowNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  int packIndex(String? p) => _packIdx[p] ?? 0;

  int dayNumber(String iso) {
    final v = dayIndex(iso) - dayIndex(config.daily['epoch'] as String) + 1;
    return v < 1 ? 1 : v;
  }

  int? targetDiff(String iso) => (config.daily['weekdayPack'] as Map)['${weekday(iso)}'] as int?;

  /// Seçim: bulmacalar `dow` alanına göre 7 kuyruğa bölünür; gerçek haftanın gününe uyan kuyruktan
  /// kuyruk[floor((gün#-1)/7) mod uzunluk]. dow yoksa zorluğa göre süz, o da yoksa havuz[(gün-1) mod boyut].
  Level? pick(List<Level> pool, String iso) {
    if (pool.isEmpty) return null;
    final day = dayNumber(iso), wk = (day - 1) ~/ 7;
    if (config.daily['selectMode'] != 'poolIndex') {
      final dow = dowNames[weekday(iso)];
      var q = pool.where((p) => p.dow == dow).toList();
      if (q.isEmpty) {
        final want = targetDiff(iso);
        q = pool.where((p) => packIndex(p.pack) == want).toList();
      }
      if (q.isNotEmpty) return q[wk % q.length];
    }
    return pool[(day - 1) % pool.length];
  }

  /// Bugüne göre seriyi değerlendir (kaçırılan gün: koruma harca ya da seriyi boz).
  SeriesEvaluation evaluate(Map<String, dynamic> d, String today) {
    final last = d['lastDay'];
    if (!jsTruthy(last)) return const SeriesEvaluation(0, false);
    final gap = dayIndex(today) - dayIndex(last as String);
    if (gap <= 1) return const SeriesEvaluation(0, false);
    final missed = gap - 1;
    if ((d['shields'] as num) >= missed) {
      d['shields'] = (d['shields'] as num) - missed;
      d['lastDay'] = addDays(today, -1);
      return SeriesEvaluation(missed, false);
    }
    d['broken'] = <String, dynamic>{'streak': d['streak'], 'missed': missed, 'day': today};
    d['streak'] = 0;
    d['lastDay'] = null;
    return const SeriesEvaluation(0, true);
  }

  bool canRescue(Map<String, dynamic> d, String today) {
    final b = d['broken'];
    if (!jsTruthy(b) || b is! Map) return false;
    if (b['day'] != today || b['missed'] != 1 || jsTruthy((d['done'] as Map)[today])) return false;
    final lr = d['lastRescueDay'];
    if (jsTruthy(lr) &&
        dayIndex(today) - dayIndex(lr as String) < 7 * (config.ads['streakRescueWeeklyMax'] as num)) {
      return false;
    }
    return true;
  }

  bool rescue(Map<String, dynamic> d, String today) {
    if (!canRescue(d, today)) return false;
    d['streak'] = (d['broken'] as Map)['streak'];
    d['lastDay'] = addDays(today, -1);
    d['broken'] = null;
    d['lastRescueDay'] = today;
    return true;
  }

  bool isDone(Map<String, dynamic> d, String today) => jsTruthy((d['done'] as Map)[today]);

  /// İlk tamamlama kaydı; tekrar oynamada seri ve paylaşım ilk sonuçtan alınır.
  /// [result] yerinde güncellenir (streak, dayNo eklenir) ve kayda girer.
  DailyCompleteResult complete(Map<String, dynamic> d, String today, Map<String, dynamic> result) {
    final done = d['done'] as Map<String, dynamic>;
    if (jsTruthy(done[today])) return DailyCompleteResult(false, done[today] as Map<String, dynamic>);
    evaluate(d, today);
    d['streak'] = (d['streak'] as num) + 1;
    d['lastDay'] = today;
    d['broken'] = null;
    var shield = false;
    if ((d['streak'] as num) % (config.daily['shieldEvery'] as num) == 0 &&
        (d['shields'] as num) < (config.daily['shieldMax'] as num)) {
      d['shields'] = (d['shields'] as num) + 1;
      shield = true;
    }
    result['streak'] = d['streak'];
    result['dayNo'] = dayNumber(today);
    done[today] = result;
    return DailyCompleteResult(true, result, shield);
  }

  /// Ay panosu: o ayın günleri.
  MonthInfo monthInfo(String today) {
    final p = parseIso(today);
    final n = daysInMonth(p.y, p.m);
    return MonthInfo(p.y, p.m, [for (var i = 1; i <= n; i++) '${p.y}-${pad2(p.m)}-${pad2(i)}']);
  }
}
