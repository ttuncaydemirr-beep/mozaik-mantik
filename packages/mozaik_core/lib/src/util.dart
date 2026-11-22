// Tarih ve biçim yardımcıları (web/src/util.js). Tarih işlemleri UTC bileşenleriyle yapılır.

/// Saat kaynağı (test edilebilirlik için dışarıdan verilir).
abstract class Clock {
  DateTime now();
}

/// Cihaz saati.
class SystemClock implements Clock {
  const SystemClock();
  @override
  DateTime now() => DateTime.now();
}

/// Sabit/elle ilerletilen saat (testler).
class FixedClock implements Clock {
  DateTime current;
  FixedClock(this.current);
  @override
  DateTime now() => current;
  void advance(Duration d) {
    current = current.add(d);
  }
}

const int dayMs = 86400000;

String pad2(num n) => n < 10 ? '0$n' : '$n';

/// "YYYY-MM-DD" -> (y, m, d)
({int y, int m, int d}) parseIso(String s) {
  final p = s.split('-');
  return (y: int.parse(p[0]), m: int.parse(p[1]), d: int.parse(p[2]));
}

/// Gün indeksi (1970-01-01 = 0).
int dayIndex(String iso) {
  final p = parseIso(iso);
  return DateTime.utc(p.y, p.m, p.d).millisecondsSinceEpoch ~/ dayMs;
}

String fromIndex(int i) {
  final d = DateTime.fromMillisecondsSinceEpoch(i * dayMs, isUtc: true);
  return '${d.year}-${pad2(d.month)}-${pad2(d.day)}';
}

String addDays(String iso, int k) => fromIndex(dayIndex(iso) + k);

/// 0 = Pazar ... 6 = Cumartesi (JS getUTCDay).
int weekday(String iso) =>
    DateTime.fromMillisecondsSinceEpoch(dayIndex(iso) * dayMs, isUtc: true).weekday % 7;

int daysInMonth(int y, int m) => DateTime.utc(y, m + 1, 0).day;

/// Verilen DateTime'ın (yerel ya da UTC, nasılsa) takvim günü.
String isoOf(DateTime d) => '${d.year}-${pad2(d.month)}-${pad2(d.day)}';

/// Bir anın yerel günü. [utcOffset] verilirse sabit fark (ör. Türkiye UTC+3) kullanılır,
/// verilmezse cihazın saat dilimi (web'deki `todayISO` ile aynı).
String localDateIso(DateTime instant, {Duration? utcOffset}) {
  if (utcOffset != null) return isoOf(instant.toUtc().add(utcOffset));
  return isoOf(instant.toLocal());
}

/// Bugünün yerel tarihi.
String todayIso(Clock clock, {Duration? utcOffset}) => localDateIso(clock.now(), utcOffset: utcOffset);

/// Sonraki yerel gece yarısına kalan ms (web `msToMidnight`).
int msToMidnight(DateTime instant, {Duration? utcOffset}) {
  if (utcOffset != null) {
    final l = instant.toUtc().add(utcOffset);
    final mid = DateTime.utc(l.year, l.month, l.day + 1);
    return mid.difference(l).inMilliseconds;
  }
  final l = instant.toLocal();
  final mid = DateTime(l.year, l.month, l.day + 1);
  return mid.difference(l).inMilliseconds;
}

String fmtTime(num ms) {
  final s = ms < 1000 ? 0 : (ms / 1000).floor();
  return '${pad2(s ~/ 60)}:${pad2(s % 60)}';
}

String fmtClock(num ms) {
  final s = ms < 1000 ? 0 : (ms / 1000).floor();
  return '${pad2(s ~/ 3600)}:${pad2((s ~/ 60) % 60)}:${pad2(s % 60)}';
}
