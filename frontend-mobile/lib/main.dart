import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'widgets/paper.dart';
import 'screens/radar_screen.dart';
import 'screens/watchlist_screen.dart';
import 'screens/alerts_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Web için firebase_options.dart tanımlı olmadığından web'de atla
  if (!kIsWeb) {
    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint('[Firebase] Başlatılamadı: $e');
    }
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CryptoSentiment — kayıt cihazı',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.recorderTheme,
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final _screens = const [
    RadarScreen(),
    WatchlistScreen(),
    AlertsScreen(),
    SettingsScreen(),
  ];

  static const _tabs = [
    ('Kayıt', 'canlı şerit'),
    ('Takip', 'seçili kanallar'),
    ('Alarm', 'eşik bildirimleri'),
    ('Ayar', 'hesap'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Kağıt tek yerde çizilir; ekranların Scaffold'ları saydam.
      body: PaperBackground(
        child: IndexedStack(index: _currentIndex, children: _screens),
      ),
      // Cihaz gövdesi: mürekkep blok, seçili kanalda kalem işareti
      bottomNavigationBar: Container(
        color: AppColors.ink,
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 58,
            child: Row(
              children: List.generate(_tabs.length, (i) {
                final selected = i == _currentIndex;
                final (label, hint) = _tabs[i];

                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _currentIndex = i),
                    child: Container(
                      decoration: BoxDecoration(
                        color: selected ? AppColors.paper : Colors.transparent,
                        border: Border(
                          top: BorderSide(
                            color: selected ? AppColors.trace : Colors.transparent,
                            width: 3,
                          ),
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            label.toUpperCase(),
                            style: AppType.label(
                              size: 11,
                              weight: FontWeight.w600,
                              color: selected ? AppColors.ink : AppColors.paper.withValues(alpha: 0.7),
                              tracking: 0.12,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            hint,
                            style: AppType.data(
                              size: 8,
                              color: selected
                                  ? AppColors.inkSoft
                                  : AppColors.paper.withValues(alpha: 0.35),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
