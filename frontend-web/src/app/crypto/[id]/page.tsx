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
import { CorrelationCard } from "@/components/detail/CorrelationCard";
import {
  fetchAsset, fetchChartData, fetchSentimentLogs, fetchSentimentSummary,
  fetchSentimentSources, fetchCorrelation, fetchWatchlist, addToWatchlist, removeFromWatchlist, getToken,
  type ApiAsset, type ApiSentimentLog, type ApiChartPoint, type ApiSentimentSource, type ApiCorrelation,
} from "@/lib/api";

export default function CryptoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [asset, setAsset] = useState<ApiAsset | null>(null);
  const [sentimentScore, setSentimentScore] = useState(0);
  const [sentimentLabel, setSentimentLabel] = useState("Neutral");
  const [priceHistory, setPriceHistory] = useState<{ timestamp: string; price: number; volume: number }[]>([]);
  const [sentimentHistory, setSentimentHistory] = useState<{ timestamp: string; score: number }[]>([]);
  const [logs, setLogs] = useState<ApiSentimentLog[]>([]);
  const [sources, setSources] = useState<ApiSentimentSource[]>([]);
  const [activeSource, setActiveSource] = useState<string>("all");
  const [correlation, setCorrelation] = useState<ApiCorrelation | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("7d");

  useEffect(() => {
    if (!asset) return;
    async function loadChart() {
      const chart = await fetchChartData(asset!.symbol, timeframe);
      if (chart && chart.data.length > 0) {
        setPriceHistory(chart.data.map((p: ApiChartPoint) => ({ timestamp: p.timestamp, price: p.price, volume: 0 })));
        setSentimentHistory(chart.data.filter((p: ApiChartPoint) => p.sentiment_score !== null).map((p: ApiChartPoint) => ({ timestamp: p.timestamp, score: p.sentiment_score ?? 0 })));
      } else {
        setPriceHistory([]);
        setSentimentHistory([]);
      }
    }
    loadChart();
  }, [timeframe, asset]);

  useEffect(() => {
    async function load() {
      try {
        const assetData = await fetchAsset(parseInt(id));
        setAsset(assetData);

        const [chart, summary, sentLogs, sentSources, corr] = await Promise.all([
          fetchChartData(assetData.symbol, "7d"),
          fetchSentimentSummary(assetData.symbol),
          fetchSentimentLogs(assetData.id, 20),
          fetchSentimentSources(assetData.id),
          fetchCorrelation(assetData.symbol),
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
        setSources(sentSources);
        if (corr) setCorrelation(corr);

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

  const handleSourceChange = async (src: string) => {
    if (!asset) return;
    setActiveSource(src);
    setLogsLoading(true);
    const filtered = await fetchSentimentLogs(asset.id, 20, src === "all" ? undefined : src);
    setLogs(filtered);
    setLogsLoading(false);
  };

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
        <Loader2 className="h-8 w-8 animate-spin text-trace-alt" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Kanal bulunamadı</p>
        <Link href="/" className="text-trace-alt text-sm mt-2 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex h-10 w-10 items-center justify-center bg-paper border border-ink/12 hover:bg-ink/8 transition-colors">
          <ArrowLeft className="h-5 w-5 text-ink" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("flex h-12 w-12 items-center justify-center  text-paper text-sm font-bold shadow-sm", "bg-ink")}>
            {asset.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">{asset.name}</h1>
              <span className="text-sm text-ink-soft">{asset.symbol}</span>
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
          className="flex h-10 w-10 items-center justify-center bg-paper border border-ink/12 hover:bg-ink/8 transition-colors disabled:opacity-50"
        >
          {watchlistLoading
            ? <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
            : <Star className={cn("h-5 w-5", isWatchlisted ? "fill-ink-soft text-ink-soft" : "text-ink-soft")} />
          }
        </button>
      </div>

      {/* Price Overview */}
      <div className="bg-paper border border-ink/12 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <div className="flex-1">
            <p className="text-xs text-ink-soft mb-1 uppercase tracking-wider font-semibold">Güncel Fiyat</p>
            <p className="text-3xl font-extrabold text-ink">{formatCurrency(asset.current_price)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1.5 border px-2.5 py-1 font-data text-[12px]",
              asset.change_24h >= 0 ? "bg-trace-alt/10 text-trace-alt border border-trace-alt/20" : "bg-trace/10 text-trace border border-trace/20")}>
              {asset.change_24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {asset.change_24h >= 0 ? "+" : ""}{asset.change_24h.toFixed(2)}%
            </div>
            {/* Timeframe selector */}
            <div className="flex bg-grid-fine/40 border border-ink/12 overflow-hidden">
              {(["24h", "7d", "30d"] as const).map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={cn("px-3 py-1.5 text-xs font-bold transition-colors",
                    timeframe === tf ? "bg-trace-alt/20 text-trace-alt" : "text-ink-soft hover:text-ink")}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {priceHistory.length > 1
          ? <PriceChart data={priceHistory} color={asset.change_24h >= 0 ? "var(--color-trace-alt)" : "var(--color-trace)"} />
          : <div className="h-32 flex items-center justify-center text-ink-soft text-sm">
              Bu zaman dilimi için yeterli veri yok
            </div>
        }

        {/* Sentiment Trend — fiyat grafiğinin hemen altında, aynı timeframe */}
        <div className="mt-4 pt-4 border-t border-ink/12">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-ink-soft" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Sentiment Trend</span>
            <span className="ml-auto text-xs text-ink-soft">
              {sentimentScore > 0 ? "+" : ""}{sentimentScore.toFixed(3)}
              <span className="ml-1.5 opacity-60">{sentimentLabel}</span>
            </span>
          </div>
          <SentimentChart data={sentimentHistory} currentScore={sentimentScore} currentLabel={sentimentLabel} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-trace-alt/5 border border-trace-alt/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-trace-alt" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Sentiment</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{sentimentScore > 0 ? "+" : ""}{sentimentScore.toFixed(2)}</p>
          <p className="text-xs text-ink-soft mt-1">{sentimentLabel}</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Volume 24h</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{formatCompactNumber(asset.volume_24h)}</p>
        </div>
        <div className="bg-ink-faint/5 border border-ink/25/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Market Cap</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{formatCompactNumber(asset.market_cap)}</p>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">News Count</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{logs.length > 0 ? logs.length : "—"}</p>
        </div>
      </div>

      {/* Korelasyon */}
      {correlation && <CorrelationCard data={correlation} />}

      {/* Recent News */}
      <div className="bg-paper border border-ink/12 overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/12">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Son haberler</h2>
              <p className="text-sm text-ink-soft">AI-powered sentiment signals</p>
            </div>
            {/* Kaynak filtre tab'ları */}
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleSourceChange("all")}
                  className={cn(
                    "px-3 py-1.5  text-xs font-bold transition-colors border",
                    activeSource === "all"
                      ? "bg-trace-alt/20 text-trace-alt border-trace-alt/30"
                      : "bg-grid-fine/40 text-ink-soft border-ink/12 hover:text-ink"
                  )}
                >
                  Tümü
                  <span className="ml-1.5 opacity-60">{sources.reduce((s, r) => s + r.count, 0)}</span>
                </button>
                {sources.map((s) => {
                  const isActive = activeSource === s.source;
                  const isPos = s.avg_score >= 0.3;
                  const isNeg = s.avg_score <= -0.3;
                  const dotColor = isPos ? "bg-trace-alt" : isNeg ? "bg-trace" : "bg-ink-faint";
                  return (
                    <button
                      key={s.source}
                      onClick={() => handleSourceChange(s.source)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5  text-xs font-bold transition-colors border",
                        isActive
                          ? "bg-grid-fine/40 text-ink border-ink/12"
                          : "bg-grid-fine/40 text-ink-soft border-ink/12 hover:text-ink"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0", dotColor)} />
                      {s.source}
                      <span className="opacity-60">{s.count}</span>
                      <span className={cn(
                        "tabular-nums",
                        isPos ? "text-trace-alt" : isNeg ? "text-trace" : "text-ink-soft"
                      )}>
                        {s.avg_score > 0 ? "+" : ""}{s.avg_score.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-ink/10">
          {logsLoading
            ? <div className="px-6 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-trace-alt mx-auto" /></div>
            : logs.length === 0
            ? <div className="px-6 py-8 text-center text-sm text-ink-soft">No news analysis yet</div>
            : logs.map((log) => {
                const isPositive = log.score >= 0.3;
                const isNegative = log.score <= -0.3;
                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                    <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center ",
                      isPositive ? "bg-paper-deep" : isNegative ? "bg-paper-deep" : "bg-paper-deep")}>
                      <span className={cn("text-xs font-bold",
                        isPositive ? "text-trace-alt" : isNegative ? "text-trace" : "text-ink-soft")}>
                        {log.score > 0 ? "+" : ""}{log.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{log.headline}</p>
                      <p className="text-xs text-ink-soft mt-1">
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
  );
}
