import 'dart:convert';
import 'dart:ui';
import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'package:http/http.dart' as http;
import '../models/crypto_asset.dart';
import 'auth_service.dart';

// Platform bazlı API URL seçimi
String get _baseUrl {
  if (kIsWeb) return 'http://localhost:8000/api/v1';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return 'http://10.0.2.2:8000/api/v1'; // Android emülatör
    case TargetPlatform.windows:
    case TargetPlatform.macOS:
    case TargetPlatform.linux:
      return 'http://localhost:8000/api/v1';
    default:
      return 'http://localhost:8000/api/v1';
  }
}

class ApiService {
  static const _headers = {'Content-Type': 'application/json'};

  // ── Assets ────────────────────────────────────────────────────────────────

  static Future<List<CryptoAsset>> fetchAssets() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/assets/'));
      if (res.statusCode != 200) return [];
      final List<dynamic> data = json.decode(res.body);
      return data.map((e) => _mapAsset(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<List<CryptoAsset>> fetchAssetsWithSentiment() async {
    final assets = await fetchAssets();
    if (assets.isEmpty) return [];

    final scores = await _fetchAllSentimentScores(assets);
    return assets.map((a) {
      final score = scores[a.symbol] ?? 0.0;
      final label = score >= 0.3
          ? 'Positive'
          : score <= -0.3
              ? 'Negative'
              : 'Neutral';
      return CryptoAsset(
        id: a.id,
        symbol: a.symbol,
        name: a.name,
        price: a.price,
        change24h: a.change24h,
        volume24h: a.volume24h,
        marketCap: a.marketCap,
        sentimentScore: score,
        sentimentLabel: label,
        sparkline: a.sparkline,
        isWatchlisted: a.isWatchlisted,
        symbolColor: a.symbolColor,
      );
    }).toList();
  }

  static Future<Map<String, double>> _fetchAllSentimentScores(
      List<CryptoAsset> assets) async {
    final scores = <String, double>{};
    await Future.wait(assets.map((asset) async {
      try {
        final res = await http.get(
          Uri.parse('$_baseUrl/assets/${asset.symbol}/sentiment-summary'),
        );
        if (res.statusCode == 200) {
          final data = json.decode(res.body) as Map<String, dynamic>;
          scores[asset.symbol] = (data['current_score'] as num).toDouble();
        }
      } catch (_) {}
    }));
    return scores;
  }

  // ── Sentiment Logs ────────────────────────────────────────────────────────

  static Future<List<SentimentLog>> fetchSentimentLogs(
      int assetId, {int limit = 10}) async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/assets/$assetId/sentiment?limit=$limit'),
      );
      if (res.statusCode != 200) return [];
      final List<dynamic> data = json.decode(res.body);
      return data.map((e) {
        final m = e as Map<String, dynamic>;
        return SentimentLog(
          id: m['id'].toString(),
          assetId: m['asset_id'].toString(),
          score: (m['score'] as num).toDouble(),
          source: m['source'] as String,
          headline: m['headline'] as String,
          timestamp: DateTime.parse(m['analyzed_at'] as String),
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<List<SentimentLog>> fetchRecentLogs() async {
    final results = await Future.wait([
      fetchSentimentLogs(1, limit: 5),
      fetchSentimentLogs(2, limit: 5),
    ]);
    final combined = [...results[0], ...results[1]];
    combined.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return combined.take(10).toList();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  /// Login yapar, başarıda {'access_token': ..., 'refresh_token': ...} döner.
  static Future<Map<String, String>?> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: _headers,
        body: json.encode({'email': email, 'password': password}),
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        return {
          'access_token': data['access_token'] as String,
          'refresh_token': data['refresh_token'] as String,
        };
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> register(String email, String password, String fullName) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/auth/register'),
        headers: _headers,
        body: json.encode({'email': email, 'password': password, 'full_name': fullName}),
      );
      return res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // ── Watchlist (auth required) ─────────────────────────────────────────────

  static Future<List<CryptoAsset>> fetchWatchlist(String token) async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/watchlist/'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode != 200) return [];
      final List<dynamic> data = json.decode(res.body);
      return data
          .map((e) => _mapAsset((e as Map<String, dynamic>)['asset'] as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Watchlist'e ekler. Başarıda true, hata varsa exception fırlatır (mesajıyla).
  static Future<bool> addToWatchlist(String token, String symbol) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/watchlist/'),
        headers: {'Authorization': 'Bearer $token', ..._headers},
        body: json.encode({'asset_symbol': symbol}),
      );
      if (res.statusCode == 201) return true;
      final body = json.decode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 401) throw Exception('Oturumunuz sona erdi. Ayarlar\'dan tekrar giriş yapın.');
      if (res.statusCode == 409) throw Exception('$symbol zaten watchlist\'inizde.');
      throw Exception(body['detail'] ?? 'Eklenemedi.');
    } on Exception {
      rethrow;
    } catch (_) {
      throw Exception('Sunucuya bağlanılamadı.');
    }
  }

  static Future<void> removeFromWatchlist(String token, String symbol) async {
    try {
      await http.delete(
        Uri.parse('$_baseUrl/watchlist/$symbol'),
        headers: {'Authorization': 'Bearer $token'},
      );
    } catch (_) {}
  }

  // ── FCM Token (auth required) ─────────────────────────────────────────────

  static Future<bool> registerFcmToken(String token, String fcmToken) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/devices/fcm-token'),
        headers: {'Authorization': 'Bearer $token', ..._headers},
        body: json.encode({'fcm_token': fcmToken}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<void> unregisterFcmToken(String token) async {
    try {
      await http.delete(
        Uri.parse('$_baseUrl/devices/fcm-token'),
        headers: {'Authorization': 'Bearer $token'},
      );
    } catch (_) {}
  }

  // ── Alerts (auth required) ───────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> fetchAlerts(String token) async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/alerts/'),
          headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode != 200) return [];
      return List<Map<String, dynamic>>.from(json.decode(res.body));
    } catch (_) {
      return [];
    }
  }

  static Future<bool> createAlert(String token, String symbol, String condition, double threshold) async {
    try {
      final res = await http.post(Uri.parse('$_baseUrl/alerts/'),
          headers: {'Authorization': 'Bearer $token', ..._headers},
          body: json.encode({'asset_symbol': symbol, 'condition': condition, 'threshold': threshold}));
      return res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  static Future<void> patchAlert(String token, int alertId, Map<String, dynamic> payload) async {
    try {
      await http.patch(Uri.parse('$_baseUrl/alerts/$alertId'),
          headers: {'Authorization': 'Bearer $token', ..._headers},
          body: json.encode(payload));
    } catch (_) {}
  }

  static Future<void> deleteAlert(String token, int alertId) async {
    try {
      await http.delete(Uri.parse('$_baseUrl/alerts/$alertId'),
          headers: {'Authorization': 'Bearer $token'});
    } catch (_) {}
  }

  // ── Add Asset (auth required) ────────────────────────────────────────────

  /// Yeni bir kripto sembolü ekler. Başarıda asset map, hata varsa exception fırlatır.
  static Future<Map<String, dynamic>> addAsset(String token, String symbol) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/assets/add'),
      headers: {'Authorization': 'Bearer $token', ..._headers},
      body: json.encode({'symbol': symbol.trim().toUpperCase()}),
    );
    final body = json.decode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 201 || res.statusCode == 200) return body;
    throw Exception(body['detail'] ?? 'Bilinmeyen hata');
  }

  // ── Pipeline ─────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> triggerPipeline(String token) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/pipeline/trigger'),
        headers: {'Authorization': 'Bearer $token'},
      );
      return json.decode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'status': 'error', 'message': 'Sunucuya bağlanılamadı.'};
    }
  }

  static Future<Map<String, dynamic>> getPipelineStatus() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/pipeline/status'));
      if (res.statusCode != 200) return {'running': false, 'cooldown_remaining_seconds': 0};
      return json.decode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'running': false, 'cooldown_remaining_seconds': 0};
    }
  }

  // ── Raw asset list (id+symbol+name+price için) ───────────────────────────

  static Future<List<Map<String, dynamic>>> fetchRawAssets() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/assets/'));
      if (res.statusCode != 200) return [];
      return List<Map<String, dynamic>>.from(json.decode(res.body));
    } catch (_) {
      return [];
    }
  }

  // ── Sentiment summary ────────────────────────────────────────────────────

  static Future<Map<String, dynamic>?> fetchSentimentSummary(String symbol) async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/assets/$symbol/sentiment-summary'));
      if (res.statusCode != 200) return null;
      return json.decode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ── Chart data ───────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>?> fetchChartData(String symbol, {String timeframe = '24h'}) async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/assets/$symbol/chart-data?timeframe=$timeframe'));
      if (res.statusCode != 200) return null;
      return json.decode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ── Auth-retry wrapper ────────────────────────────────────────────────────

  /// Token gerektiren her HTTP çağrısı için wrapper.
  /// 401 gelirse sessizce refresh yapar ve bir kez daha dener.
  static Future<http.Response> authedRequest(
    Future<http.Response> Function(String token) makeRequest,
  ) async {
    final token = AuthService.instance.token;
    if (token == null) {
      return http.Response('{"detail":"Unauthorized"}', 401);
    }
    var res = await makeRequest(token);
    if (res.statusCode == 401) {
      final refreshed = await AuthService.instance.silentRefresh();
      if (refreshed && AuthService.instance.token != null) {
        res = await makeRequest(AuthService.instance.token!);
      }
    }
    return res;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  static CryptoAsset _mapAsset(Map<String, dynamic> e) {
    final change = (e['change_24h'] as num).toDouble();
    final price = (e['current_price'] as num).toDouble();
    final symbol = e['symbol'] as String;
    return CryptoAsset(
      id: e['id'].toString(),
      symbol: symbol,
      name: e['name'] as String,
      price: price,
      change24h: change,
      volume24h: (e['volume_24h'] as num).toDouble(),
      marketCap: (e['market_cap'] as num).toDouble(),
      sentimentScore: 0.0,
      sentimentLabel: 'Neutral',
      sparkline: _generateSparkline(price, change),
      isWatchlisted: false,
      symbolColor: _symbolColor(symbol),
    );
  }

  static List<double> _generateSparkline(double base, double change) {
    final trend = change > 0 ? 1.0 : -1.0;
    var val = base * 0.97;
    return List.generate(24, (i) {
      val += (trend * base * 0.001) + (base * 0.002 * (i % 3 == 0 ? 1 : -0.5));
      return val;
    });
  }

  static Color _symbolColor(String symbol) {
    const map = {
      'BTC':  Color(0xFFF97316),
      'ETH':  Color(0xFF6366F1),
      'SOL':  Color(0xFFA855F7),
      'ADA':  Color(0xFF3B82F6),
      'XRP':  Color(0xFF475569),
      'DOGE': Color(0xFFEAB308),
      'AVAX': Color(0xFFEF4444),
      'DOT':  Color(0xFFEC4899),
      'BNB':  Color(0xFFF59E0B),
    };
    return map[symbol] ?? const Color(0xFF64748B);
  }
}
