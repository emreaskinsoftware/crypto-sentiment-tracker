import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform, ChangeNotifier;
import 'package:http/http.dart' as http;

String get _authBaseUrl {
  if (kIsWeb) return 'http://localhost:8000/api/v1';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return 'http://10.0.2.2:8000/api/v1';
    default:
      return 'http://localhost:8000/api/v1';
  }
}

/// Uygulama genelinde paylaşılan kimlik doğrulama durumu.
/// ChangeNotifier ile: bir yerden giriş yapınca tüm dinleyen
/// widget'lar otomatik olarak yeniden çizilir.
class AuthService extends ChangeNotifier {
  AuthService._();
  static final AuthService instance = AuthService._();

  String? _token;
  String? _refreshToken;
  String? _email;

  String? get token => _token;
  String? get email => _email;
  bool get isLoggedIn => _token != null;

  void setAuth(String token, String refreshToken, String email) {
    _token = token;
    _refreshToken = refreshToken;
    _email = email;
    notifyListeners();
  }

  void logout() {
    _token = null;
    _refreshToken = null;
    _email = null;
    notifyListeners();
  }

  /// Sessizce yeni access token alır. Başarısızlıkta logout yapar.
  Future<bool> silentRefresh() async {
    if (_refreshToken == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$_authBaseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'refresh_token': _refreshToken}),
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        _token = data['access_token'] as String;
        _refreshToken = data['refresh_token'] as String;
        notifyListeners();
        return true;
      }
    } catch (_) {}
    logout();
    return false;
  }
}
