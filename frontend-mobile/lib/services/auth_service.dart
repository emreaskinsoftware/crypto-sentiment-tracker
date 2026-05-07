/// Uygulama genelinde paylaşılan kimlik doğrulama durumu.
/// Tüm ekranlar bu singleton'ı kullanır — bir yerden giriş yapınca
/// diğer ekranlar da anında auth olmuş görünür.
class AuthService {
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
  }

  void logout() {
    _token = null;
    _email = null;
  }
}
