// JavaScript tür dönüşümlerinin (Number(x), !!x) birebir karşılıkları.
// Web kaydı (JSON) bozuk/yanlış türde alanlar içerebilir; web tarafı bunları `+x` ve `!!x`
// ile yorumlar. Kayıt uyumluluğu için Dart tarafı aynı sonucu üretmelidir.

const Set<int> _jsWhitespace = {
  0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, //
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, //
  0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF,
};

/// JS `String.prototype.trim` karşılığı.
String jsTrim(String s) {
  var a = 0, b = s.length;
  while (a < b && _jsWhitespace.contains(s.codeUnitAt(a))) {
    a++;
  }
  while (b > a && _jsWhitespace.contains(s.codeUnitAt(b - 1))) {
    b--;
  }
  return s.substring(a, b);
}

final RegExp _decimal = RegExp(r'^[+-]?((\d+)(\.\d*)?|\.\d+)([eE][+-]?\d+)?$');
final RegExp _hex = RegExp(r'^0[xX][0-9a-fA-F]+$');
final RegExp _bin = RegExp(r'^0[bB][01]+$');
final RegExp _oct = RegExp(r'^0[oO][0-7]+$');

num _stringToNumber(String s) {
  final t = jsTrim(s);
  if (t.isEmpty) return 0;
  if (t == 'Infinity' || t == '+Infinity') return double.infinity;
  if (t == '-Infinity') return double.negativeInfinity;
  if (_hex.hasMatch(t)) return int.parse(t.substring(2), radix: 16);
  if (_bin.hasMatch(t)) return int.parse(t.substring(2), radix: 2);
  if (_oct.hasMatch(t)) return int.parse(t.substring(2), radix: 8);
  if (!_decimal.hasMatch(t)) return double.nan;
  final i = int.tryParse(t);
  if (i != null) return i;
  var u = t;
  if (u.endsWith('.')) u = u.substring(0, u.length - 1);
  u = u.replaceFirst(RegExp(r'\.(?=[eE])'), '');
  return double.parse(u);
}

String _jsToString(Object? x) {
  if (x == null) return '';
  if (x is List) return x.map(_jsToString).join(',');
  if (x is Map) return '[object Object]';
  if (x is double && x == x.truncateToDouble() && x.isFinite) return x.toInt().toString();
  return '$x';
}

/// JS `Number(x)` (tekli `+x`). NaN için [double.nan] döner.
num jsToNumber(Object? x) {
  if (x == null) return 0;
  if (x is num) return x;
  if (x is bool) return x ? 1 : 0;
  if (x is String) return _stringToNumber(x);
  if (x is List) return _stringToNumber(x.map(_jsToString).join(','));
  return double.nan;
}

/// JS `!!x`.
bool jsTruthy(Object? x) {
  if (x == null) return false;
  if (x is bool) return x;
  if (x is num) return x != 0 && !x.isNaN;
  if (x is String) return x.isNotEmpty;
  return true;
}

/// JSON benzeri değerlerin derin kopyası (Map/List).
Object? deepCopy(Object? x) {
  if (x is Map) {
    final out = <String, dynamic>{};
    for (final e in x.entries) {
      out['${e.key}'] = deepCopy(e.value);
    }
    return out;
  }
  if (x is List) return x.map(deepCopy).toList();
  return x;
}
