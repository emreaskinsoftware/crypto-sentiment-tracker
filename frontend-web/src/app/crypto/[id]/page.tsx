"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Star, TrendingUp, TrendingDown,
  Activity, BarChart3, Globe, MessageSquare, Loader2,
} from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { PriceChart } from "@/components/detail/PriceChart";
import { SentimentChart } from "@/components/detail/SentimentChart";
import {
  fetchAsset, fetchChartData, fetchSentimentLogs, fetchSentimentSummary,
  fetchWatchlist, addToWatchlist, removeFromWatchlist, getToken,
  type ApiAsset, type ApiSentimentLog, type ApiChartPoint,
} from "@/lib/api";

const symbolColors: Record<string, string> = {
  BTC: "bg-orange-500", ETH: "bg-indigo-500", SOL: "bg-purple-500",
  ADA: "bg-blue-500",   XRP: "bg-slate-700",  DOGE: "bg-yellow-500",
  AVAX: "bg-red-500",   DOT: "bg-pink-500",
};

export default function CryptoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [asset, setAsset] = useState<ApiAsset | null>(null);
  const [sentimentScore, setSentimentScore] = useState(0);
  const [sentimentLabel, setSentimentLabel] = useState("Neutral");
  const [priceHistory, setPriceHistory] = useState<{ timestamp: string; price: number; volume: number }[]>([]);
  const [sentimentHistory, setSentimentHistory] = useState<{ timestamp: string; score: number }[]>([]);
  const [logs, setLogs] = useState<ApiSentimentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const assetData = await fetchAsset(parseInt(id));
        setAsset(assetData);

        const [chart, summary, sentLogs] = await Promise.all([
          fetchChartData(assetData.symbol, "24h"),
          fetchSentimentSummary(assetData.symbol),
          fetchSentimentLogs(assetData.id, 8),
        ]);

        if (summary) {
          setSentimentScore(summary.current_score);
          setSentimentLabel(summary.status);
        }

        if (chart && chart.data.length > 0) {
          setPriceHistory(chart.data.map((p: ApiChartPoint) => ({
            timestamp: p.timestamp, price: p.price, volume: 0,
          })));
          setSentimentHistory(
            chart.data
              .filter((p: ApiChartPoint) => p.sentiment_score !== null)
              .map((p: ApiChartPoint) => ({ timestamp: p.timestamp, score: p.sentiment_score ?? 0 }))
          );
        }

        setLogs(sentLogs);

        // Watchlist durumunu kontrol et
        if (getToken()) {
          const wl = await fetchWatchlist();
          setIsWatchlisted(wl.some((w) => w.asset.symbol === assetData.symbol));
        }
      } catch {
        // asset not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleWatchlistToggle = async () => {
    if (!asset) return;
    if (!getToken()) {
      alert("Watchlist için önce Settings sayfasından giriş yapın.");
      return;
    }
    setWatchlistLoading(true);
    try {
      if (isWatchlisted) {
        await removeFromWatchlist(asset.symbol);
        setIsWatchlisted(false);
      } else {
        await addToWatchlist(asset.symbol);
        setIsWatchlisted(true);
      }
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-lg font-bold text-text-primary">Asset not found</p>
        <Link href="/" className="text-primary text-sm mt-2 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light border border-black/5 hover:bg-black/5 transition-colors">
          <ArrowLeft className="h-5 w-5 text-text-primary" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white text-sm font-bold shadow-sm", symbolColors[asset.symbol] || "bg-slate-500")}>
            {asset.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">{asset.name}</h1>
              <span className="text-sm text-text-secondary">{asset.symbol}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <SentimentBadge score={sentimentScore} size="sm" />
            </div>
          </div>
        </div>
        {/* Watchlist butonu */}
        <button
          onClick={handleWatchlistToggle}
          disabled={watchlistLoading}
          title={isWatchlisted ? "Watchlist'ten çıkar" : "Watchlist'e ekle"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light border border-black/5 hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          {watchlistLoading
            ? <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            : <Star className={cn("h-5 w-5", isWatchlisted ? "fill-warning text-warning" : "text-text-secondary")} />
          }
        </button>
      </div>

      {/* Price Overview */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div>
            <p className="text-sm text-text-secondary mb-1">Current Price</p>
            <p className="text-3xl font-extrabold text-text-primary">{formatCurrency(asset.current_price)}</p>
          </div>
          <div className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold",
            asset.change_24h >= 0 ? "bg-pastel-green text-primary" : "bg-pastel-red text-danger")}>
            {asset.change_24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {asset.change_24h >= 0 ? "+" : ""}{asset.change_24h.toFixed(2)}% (24h)
          </div>
        </div>

        {priceHistory.length > 0
          ? <PriceChart data={priceHistory} color={asset.change_24h >= 0 ? "#10B981" : "#EF4444"} />
          : <div className="h-32 flex items-center justify-center text-text-secondary text-sm">No price history available</div>
        }
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-pastel-green border border-primary/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Sentiment</span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">{sentimentScore > 0 ? "+" : ""}{sentimentScore.toFixed(2)}</p>
          <p className="text-xs text-text-secondary mt-1">{sentimentLabel}</p>
        </div>
        <div className="rounded-2xl bg-pastel-blue border border-blue-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Volume 24h</span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">{formatCompactNumber(asset.volume_24h)}</p>
        </div>
        <div className="rounded-2xl bg-pastel-yellow border border-yellow-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Market Cap</span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">{formatCompactNumber(asset.market_cap)}</p>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">News Count</span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">{logs.length > 0 ? logs.length : "—"}</p>
        </div>
      </div>

      {/* Sentiment + News */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-1">Sentiment History</h2>
          <p className="text-sm text-text-secondary mb-4">FinBERT analysis over 24h</p>
          {sentimentHistory.length > 0
            ? <SentimentChart data={sentimentHistory} />
            : <div className="h-32 flex items-center justify-center text-text-secondary text-sm">No sentiment history available</div>
          }
        </div>

        <div className="rounded-2xl bg-surface-light border border-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/5">
            <h2 className="text-lg font-bold text-text-primary">Recent News & Analysis</h2>
            <p className="text-sm text-text-secondary">AI-powered sentiment signals</p>
          </div>
          <div className="divide-y divide-black/5">
            {logs.length === 0
              ? <div className="px-6 py-8 text-center text-sm text-text-secondary">No news analysis yet</div>
              : logs.map((log) => {
                  const isPositive = log.score >= 0.3;
                  const isNegative = log.score <= -0.3;
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                      <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isPositive ? "bg-pastel-green" : isNegative ? "bg-pastel-red" : "bg-pastel-yellow")}>
                        <span className={cn("text-xs font-bold",
                          isPositive ? "text-primary" : isNegative ? "text-danger" : "text-warning")}>
                          {log.score > 0 ? "+" : ""}{log.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">{log.headline}</p>
                        <p className="text-xs text-text-secondary mt-1">
                          {log.source} • {new Date(log.analyzed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
