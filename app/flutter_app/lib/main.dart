import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'firebase_options.dart';
import 'screens/alert_history_screen.dart';
import 'screens/auth_gate.dart';
import 'screens/live_stream_screen.dart';
import 'screens/printer_detail_screen.dart';
import 'services/messaging_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const ProviderScope(child: PrintWatchApp()));
}

class PrintWatchApp extends ConsumerStatefulWidget {
  const PrintWatchApp({super.key});

  @override
  ConsumerState<PrintWatchApp> createState() => _PrintWatchAppState();
}

class _PrintWatchAppState extends ConsumerState<PrintWatchApp> {
  @override
  void initState() {
    super.initState();
    FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null && user.email?.endsWith('@dimigo.hs.kr') == true) {
        ref.read(messagingServiceProvider).registerToken();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PrintWatch AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF226C63),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        cardTheme: const CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
        ),
      ),
      home: const AuthGate(),
      routes: {AlertHistoryScreen.routeName: (_) => const AlertHistoryScreen()},
      onGenerateRoute: (settings) {
        if (settings.name == PrinterDetailScreen.routeName) {
          return MaterialPageRoute(
            builder: (_) =>
                PrinterDetailScreen(printerId: settings.arguments as String),
          );
        }
        if (settings.name == LiveStreamScreen.routeName) {
          return MaterialPageRoute(
            builder: (_) =>
                LiveStreamScreen(printerId: settings.arguments as String),
          );
        }
        return null;
      },
    );
  }
}
