import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Arka plan mesaj işleyici — top-level fonksiyon olmalı
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM] Arka plan mesajı: ${message.notification?.title}');
}

class PushNotificationService {
  static final _messaging = FirebaseMessaging.instance;

  /// Firebase'i başlat, izin iste, token kaydet
  static Future<void> init({String? authToken}) async {
    // Bildirim izni iste (Android 13+ ve iOS için)
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('[FCM] Bildirim izni reddedildi.');
      return;
    }

    // Arka plan mesaj işleyici kaydet
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    // Ön plan mesaj işleyici
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM] Ön plan mesajı: ${message.notification?.title}');
      debugPrint('[FCM] Body: ${message.notification?.body}');
    });

    // Bildirime tıklanınca
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] Bildirimine tıklandı: ${message.data}');
    });

    // FCM token al ve API'ye kaydet
    await _registerToken(authToken: authToken);

    // Token yenilenmesi durumunda güncelle
    _messaging.onTokenRefresh.listen((newToken) async {
      await _sendTokenToServer(newToken, authToken: authToken);
    });
  }

  static Future<void> _registerToken({String? authToken}) async {
    try {
      final token = await _messaging.getToken();
      if (token == null) return;
      debugPrint('[FCM] Token: ${token.substring(0, 20)}…');
      if (authToken != null) {
        await _sendTokenToServer(token, authToken: authToken);
      }
    } catch (e) {
      debugPrint('[FCM] Token alınamadı: $e');
    }
  }

  static Future<void> _sendTokenToServer(String fcmToken,
      {String? authToken}) async {
    if (authToken == null) return;
    try {
      await ApiService.registerFcmToken(authToken, fcmToken);
      debugPrint('[FCM] Token API\'ye kaydedildi.');
    } catch (e) {
      debugPrint('[FCM] Token kaydedilemedi: $e');
    }
  }

  /// Logout sırasında token'ı sunucudan sil
  static Future<void> unregister(String authToken) async {
    try {
      await ApiService.unregisterFcmToken(authToken);
      await _messaging.deleteToken();
    } catch (e) {
      debugPrint('[FCM] Token silinemedi: $e');
    }
  }
}
