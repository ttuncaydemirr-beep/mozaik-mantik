import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'i18n/i18n.dart';
import 'theme/theme.dart';
import 'theme/tokens.dart';

/// Gömülü yazı tiplerinin OFL lisanslarını lisans sayfasına ekler.
void registerFontLicenses() {
  LicenseRegistry.addLicense(() async* {
    const fonts = {
      'Onest': 'assets/fonts/OFL-Onest.txt',
      'El Messiri': 'assets/fonts/OFL-ElMessiri.txt',
      'Noto Kufi Arabic': 'assets/fonts/OFL-NotoKufiArabic.txt',
    };
    for (final e in fonts.entries) {
      final text = await rootBundle.loadString(e.value);
      yield LicenseEntryWithLineBreaks([e.key], text);
    }
  });
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  registerFontLicenses();
  await SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  final lang = pickLang(PlatformDispatcher.instance.locales);
  final i18n = await I18n.load(lang);
  runApp(MozaikApp(i18n: i18n));
}

class MozaikApp extends StatelessWidget {
  const MozaikApp({super.key, required this.i18n});

  final I18n i18n;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      onGenerateTitle: (_) => i18n.t('app_name'),
      debugShowCheckedModeBanner: false,
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: ThemeMode.system,
      locale: i18n.locale,
      supportedLocales: [for (final l in kSupportedLangs) Locale(l)],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: HomeScreen(i18n: i18n),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.i18n});

  final I18n i18n;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final tk = dark ? kDarkTokens : kLightTokens;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                i18n.t('app_name'),
                key: const Key('title'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: kFontDisplay,
                  fontFamilyFallback: kUiFallback,
                  fontSize: 44,
                  fontWeight: FontWeight.w700,
                  color: tk.text,
                ),
              ),
              const SizedBox(height: 32),
              FilledButton(
                key: const Key('play'),
                onPressed: () {},
                child: Text(
                  i18n.t('menu_play'),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
