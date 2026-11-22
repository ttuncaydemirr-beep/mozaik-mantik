// Paylaşım metni (web/src/share.js birebir): yalnız emoji, rakam, oyun adı; çözümün konumunu vermez.
// RTL dillerde her satırın başına U+200E (LRM) eklenir.
import 'config.dart';
import 'util.dart';

const String lrm = '‎';
const Map<String, String> _sq = {'c': '\u{1F7E6}', 'h': '\u{1F7E8}', 'x': '\u{1F7E5}'};

class ShareInput {
  final int dayNo;
  final num time;
  final num hints;
  final num errors;
  final int stars;
  final num streak;

  /// konulma sırasıyla 'c' temiz, 'h' ipucuyla, 'x' çakışma yaratıp düzeltilmiş
  final List<String> strip;
  final bool rtl;
  const ShareInput({
    required this.dayNo,
    required this.time,
    required this.hints,
    required this.errors,
    required this.stars,
    required this.streak,
    required this.strip,
    this.rtl = false,
  });
}

class Share {
  final MozaikConfig config;
  const Share(this.config);

  String build(ShareInput o) {
    final st = StringBuffer();
    for (var i = 0; i < 3; i++) {
      st.write(i < o.stars ? '★' : '☆');
    }
    var lines = <String>[
      'Mozaik Mantık #${o.dayNo}',
      '⏱ ${fmtTime(o.time)}   \u{1F4A1} ${o.hints}   ✖ ${o.errors}   $st   \u{1F525} ${o.streak}',
      o.strip.map((k) => _sq[k] ?? _sq['c']!).join(),
      config.siteUrl,
    ];
    if (o.rtl) lines = lines.map((l) => '$lrm$l').toList();
    return lines.join('\n');
  }
}
