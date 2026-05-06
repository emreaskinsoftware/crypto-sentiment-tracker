import 'dart:convert';
import 'dart:ui';
import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'package:http/http.dart' as http;
import '../models/crypto_asset.dart';

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

  static Future<String?> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: _headers,
        body: json.encode({'email': email, 'password': password}),
      );
      if (res.statusCode == 200) {
        return json.decode(res.body)['access_token'] as String;
      }
    } catch (_) {}
    return null;
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

  static Future<bool> addToWatchlist(String token, String symbol) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/watchlist/'),
        headers: {'Authorization': 'Bearer $token', ..._headers},
        body: json.encode({'asset_symbol': symbol}),
      );
      return res.statusCode == 201;
    } catch (_) {
      return false;
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
