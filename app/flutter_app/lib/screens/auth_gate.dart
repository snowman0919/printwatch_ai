import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/auth_service.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';
import 'unauthorized_screen.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    return auth.when(
      data: (user) {
        if (user == null) {
          return const LoginScreen();
        }
        if (!_isDimigoUser(user)) {
          ref.read(authServiceProvider).signOut();
          return UnauthorizedScreen(email: user.email ?? '');
        }
        return const DashboardScreen();
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) =>
          Scaffold(body: Center(child: Text('로그인 상태를 확인할 수 없습니다.\n$error'))),
    );
  }

  bool _isDimigoUser(User user) {
    return user.email?.endsWith('@dimigo.hs.kr') == true;
  }
}
