import 'package:flutter/foundation.dart';

/// Uygulama genelinde paylaşılan kimlik doğrulama durumu.
/// ChangeNotifier ile: bir yerden giriş yapınca tüm dinleyen
/// widget'lar otomatik olarak yeniden çizilir.
class AuthService extends ChangeNotifier {
  AuthService._();
  static final AuthService instance = AuthService._();

  String? _token;
  String? _email;

  String? get token => _token;
  String? get email => _email;
  bool get isLoggedIn => _token != null;

  void setAuth(String token, String email) {
    _token = token;
    _email = email;
    notifyListeners(); // Tüm dinleyen widget'ları yeniden çiz
  }

  void logout() {
    _token = null;
    _email = null;
    notifyListeners();
  }
}
