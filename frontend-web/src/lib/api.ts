const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Client-side Utilities ────────────────────────────────────────────────────

export function generateSparkline(base: number, trend: number): number[] {
  const data: number[] = [];
  let value = base;
  for (let i = 0; i < 24; i++) {
    value += (Math.random() - 0.5 + trend * 0.1) * base * 0.02;
    data.push(Math.round(value * 100) / 100);
  }
  return data;
}

// ─── Backend Response Types ───────────────────────────────────────────────────

export interface ApiAsset {
  id: number;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  volume_24h: number;
  change_24h: number;
  last_updated: string;
}

export interface ApiSentimentSummary {
  symbol: string;
  current_score: number;
  status: "Positive" | "Neutral" | "Negative";
  news_count_last_hour: number;
}

export interface ApiSentimentLog {
  id: number;
  asset_id: number;
  score: number;
  source: string;
  headline: string;
  url: string | null;
  analyzed_at: string;
}

export interface ApiChartPoint {
  timestamp: string;
  price: number;
  sentiment_score: number | null;
}

export interface ApiChartData {
  symbol: string;
  timeframe: string;
  data: ApiChartPoint[];
}

export interface ApiAlert {
  id: number;
  user_id: number;
  asset_id: number;
  condition_type: string;
  threshold: number;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface ApiWatchlistItem {
  id: number;
  asset: ApiAsset;
  added_at: string;
}

export interface ApiDashboardSummary {
  total_assets: number;
  total_market_cap: number;
  avg_sentiment_score: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
}

export interface ApiTopMovers {
  gainers: ApiAsset[];
  losers: ApiAsset[];
}

export interface ApiTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ─── Auth Helpers (client-side only) ─────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setRefreshToken(token: string) {
  localStorage.setItem("refresh_token", token);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let _refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  // Eş zamanlı birden fazla refresh isteğini tek promise'a indir
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) { clearToken(); return false; }
      const data: ApiTokenResponse = await res.json();
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}

async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const headers = { ...authHeaders(), ...(init.headers as Record<string, string> ?? {}) };
  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      const retryHeaders = { ...authHeaders(), ...(init.headers as Record<string, string> ?? {}) };
      return fetch(input, { ...init, headers: retryHeaders });
    }
  }
  return res;
}

// ─── Public Endpoints ─────────────────────────────────────────────────────────

export async function fetchAssets(): Promise<ApiAsset[]> {
  const res = await fetch(`${API_BASE}/assets/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch assets");
  return res.json();
}

export interface ApiLivePrice {
  symbol: string;
  price: number;
  change_24h: number;
}

export async function fetchLivePrices(): Promise<ApiLivePrice[]> {
  const res = await fetch(`${API_BASE}/assets/live-prices`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAsset(id: number): Promise<ApiAsset> {
  const res = await fetch(`${API_BASE}/assets/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Asset ${id} not found`);
  return res.json();
}

export async function fetchSentimentSummary(
  symbol: string
): Promise<ApiSentimentSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/assets/${symbol}/sentiment-summary`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchChartData(
  symbol: string,
  timeframe = "30d"
): Promise<ApiChartData | null> {
  try {
    const res = await fetch(
      `${API_BASE}/assets/${symbol}/chart-data?timeframe=${timeframe}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchSentimentLogs(
  assetId: number,
  limit = 10,
  source?: string
): Promise<ApiSentimentLog[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (source) params.set("source", source);
    const res = await fetch(
      `${API_BASE}/assets/${assetId}/sentiment?${params}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export interface ApiSentimentSource {
  source: string;
  count: number;
  avg_score: number;
}

export interface ApiLagResult {
  lag_hours: number;
  correlation: number | null;
  sample_size: number;
}

export interface ApiCorrelation {
  symbol: string;
  sufficient_data: boolean;
  message?: string;
  sample_size: number;
  lags: ApiLagResult[];
  best_lag: ApiLagResult | null;
  interpretation?: string;
}

export async function fetchCorrelation(symbol: string): Promise<ApiCorrelation | null> {
  try {
    const res = await fetch(`${API_BASE}/assets/${symbol}/correlation`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchSentimentSources(assetId: number): Promise<ApiSentimentSource[]> {
  try {
    const res = await fetch(`${API_BASE}/assets/${assetId}/sentiment-sources`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchDashboardSummary(): Promise<ApiDashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
}

export async function fetchTopMovers(limit = 3): Promise<ApiTopMovers> {
  const res = await fetch(
    `${API_BASE}/dashboard/top-movers?limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch top movers");
  return res.json();
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

export async function apiLogin(
  email: string,
  password: string
): Promise<string | null> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data: ApiTokenResponse = await res.json();
  setRefreshToken(data.refresh_token);
  return data.access_token;
}

export async function apiRegister(
  email: string,
  password: string,
  fullName: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  return res.ok;
}

// ─── Authenticated Endpoints (client-side only) ───────────────────────────────

export interface ApiAssetMood {
  symbol: string;
  name: string;
  current_score: number | null;
  week_ago_score: number | null;
}

export interface ApiPortfolioMood {
  asset_count: number;
  current_avg: number | null;
  week_ago_avg: number | null;
  change_pct: number | null;
  direction: "better" | "worse" | "same" | "unknown";
  current_label: string;
  assets: ApiAssetMood[];
}

export async function fetchPortfolioMood(): Promise<ApiPortfolioMood | null> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/watchlist/mood`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchWatchlist(): Promise<ApiWatchlistItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/watchlist/`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addToWatchlist(
  assetSymbol: string
): Promise<ApiWatchlistItem | null> {
  const res = await fetchWithAuth(`${API_BASE}/watchlist/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_symbol: assetSymbol }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function addToWatchlistDetailed(
  assetSymbol: string
): Promise<{ item: ApiWatchlistItem | null; error: string | null }> {
  if (!getToken()) return { item: null, error: "Giriş yapmanız gerekiyor. Ayarlar sayfasından giriş yapın." };

  const res = await fetchWithAuth(`${API_BASE}/watchlist/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_symbol: assetSymbol }),
  });

  if (res.ok) return { item: await res.json(), error: null };

  let detail = "Bir hata oluştu.";
  try {
    const body = await res.json();
    if (res.status === 401) detail = "Oturumunuz sona erdi. Ayarlar sayfasından tekrar giriş yapın.";
    else if (res.status === 409) detail = `${assetSymbol.toUpperCase()} zaten watchlist'inizde.`;
    else detail = body.detail ?? detail;
  } catch { /* json parse hatası */ }

  return { item: null, error: detail };
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/watchlist/${symbol}`, { method: "DELETE" });
}

export async function fetchAlerts(): Promise<ApiAlert[]> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createAlert(payload: {
  asset_symbol: string;
  condition: string;
  threshold: number;
}): Promise<ApiAlert | null> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteAlert(alertId: number): Promise<void> {
  await fetchWithAuth(`${API_BASE}/alerts/${alertId}`, { method: "DELETE" });
}

export interface ApiNotification {
  id: number;
  alert_id: number;
  asset_symbol: string;
  asset_name: string;
  condition_type: string;
  threshold: number;
  actual_value: number;
  triggered_at: string;
}

export async function fetchNotifications(): Promise<ApiNotification[]> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/notifications`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function markNotificationsRead(ids: number[]): Promise<void> {
  await fetchWithAuth(`${API_BASE}/alerts/notifications/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function patchAlert(
  alertId: number,
  payload: { is_active?: boolean; threshold?: number }
): Promise<ApiAlert | null> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${alertId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function addAsset(
  symbol: string
): Promise<{ asset: ApiAsset | null; error: string | null }> {
  if (!getToken()) return { asset: null, error: "Giriş yapmanız gerekiyor." };

  const res = await fetchWithAuth(`${API_BASE}/assets/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: symbol.toUpperCase().trim() }),
  });

  if (res.status === 201 || res.status === 200) {
    const asset: ApiAsset = await res.json();
    return { asset, error: null };
  }

  try {
    const body = await res.json();
    return { asset: null, error: body.detail ?? "Bir hata oluştu." };
  } catch {
    return { asset: null, error: "Sunucu hatası." };
  }
}
