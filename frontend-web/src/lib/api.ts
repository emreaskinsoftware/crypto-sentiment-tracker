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
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Public Endpoints ─────────────────────────────────────────────────────────

export async function fetchAssets(): Promise<ApiAsset[]> {
  const res = await fetch(`${API_BASE}/assets/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch assets");
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
  limit = 10
): Promise<ApiSentimentLog[]> {
  try {
    const res = await fetch(
      `${API_BASE}/assets/${assetId}/sentiment?limit=${limit}`,
      { cache: "no-store" }
    );
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

export async function fetchWatchlist(): Promise<ApiWatchlistItem[]> {
  const res = await fetch(`${API_BASE}/watchlist/`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addToWatchlist(
  assetSymbol: string
): Promise<ApiWatchlistItem | null> {
  const res = await fetch(`${API_BASE}/watchlist/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ asset_symbol: assetSymbol }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  await fetch(`${API_BASE}/watchlist/${symbol}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function fetchAlerts(): Promise<ApiAlert[]> {
  const res = await fetch(`${API_BASE}/alerts/`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createAlert(payload: {
  asset_symbol: string;
  condition: string;
  threshold: number;
}): Promise<ApiAlert | null> {
  const res = await fetch(`${API_BASE}/alerts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteAlert(alertId: number): Promise<void> {
  await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function patchAlert(
  alertId: number,
  payload: { is_active?: boolean; threshold?: number }
): Promise<ApiAlert | null> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}
