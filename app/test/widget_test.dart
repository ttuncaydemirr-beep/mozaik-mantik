import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mozaik_mantik/i18n/i18n.dart';
import 'package:mozaik_mantik/main.dart';

Future<I18n> _load(WidgetTester tester, String lang) async {
  final i18n = await tester.runAsync(() => I18n.load(lang));
  return i18n!;
}

void main() {
  testWidgets('uygulama açılır, başlık ve Oyna görünür (tr)', (tester) async {
    final i18n = await _load(tester, 'tr');
    await tester.pumpWidget(MozaikApp(i18n: i18n));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('title')), findsOneWidget);
    expect(find.text('Mozaik Mantık'), findsOneWidget);
    expect(find.text(i18n.t('menu_play')), findsOneWidget);
  });

  testWidgets('Arapça RTL ve yerelleştirilmiş başlık', (tester) async {
    final i18n = await _load(tester, 'ar');
    await tester.pumpWidget(MozaikApp(i18n: i18n));
    await tester.pumpAndSettle();
    final ctx = tester.element(find.byKey(const Key('title')));
    expect(Directionality.of(ctx), TextDirection.rtl);
    expect(find.text(i18n.t('app_name')), findsOneWidget);
  });

  test('dil seçimi: desteklenmeyen dil İngilizceye düşer', () {
    expect(pickLang(const [Locale('fr'), Locale('de', 'AT')]), 'de');
    expect(pickLang(const [Locale('fr')]), 'en');
    expect(kSupportedLangs.length, 8);
  });
}
