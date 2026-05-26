import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());
final authStateProvider = StreamProvider<User?>(
  (ref) => FirebaseAuth.instance.authStateChanges(),
);

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  bool _googleReady = false;

  Future<void> signInWithGoogle() async {
    await _initGoogle();
    final account = await GoogleSignIn.instance.authenticate();
    final idToken = account.authentication.idToken;
    final credential = GoogleAuthProvider.credential(idToken: idToken);
    final userCredential = await _auth.signInWithCredential(credential);
    final email = userCredential.user?.email ?? account.email;
    if (!email.endsWith('@dimigo.hs.kr')) {
      await signOut();
      throw UnauthorizedDomainException(email);
    }
    await _functions.httpsCallable('validateDimigoUser').call();
  }

  Future<void> signOut() async {
    await _auth.signOut();
    if (_googleReady) {
      await GoogleSignIn.instance.signOut();
    }
  }

  Future<void> _initGoogle() async {
    if (_googleReady) {
      return;
    }
    await GoogleSignIn.instance.initialize(hostedDomain: 'dimigo.hs.kr');
    _googleReady = true;
  }
}

class UnauthorizedDomainException implements Exception {
  UnauthorizedDomainException(this.email);
  final String email;
}
