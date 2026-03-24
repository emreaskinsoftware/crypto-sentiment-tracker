"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Globe,
  MessageSquare,
} from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { PriceChart } from "@/components/detail/PriceChart";
import { SentimentChart } from "@/components/detail/SentimentChart";
import {
  mockAssets,
  mockSentimentLogs,
  generatePriceHistory,
  generateSentimentHistory,
} from "@/lib/mock-data";

const symbolColors: Record<string, string> = {
  BTC: "bg-orange-500",
  ETH: "bg-indigo-500",
  SOL: "bg-purple-500",
  ADA: "bg-blue-500",
  XRP: "bg-slate-700",
  DOGE: "bg-yellow-500",
  AVAX: "bg-red-500",
  DOT: "bg-pink-500",
};

export default function CryptoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const asset = mockAssets.find((a) => a.id === id);

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-lg font-bold text-text-primary">Asset not found</p>
        <Link href="/" className="text-primary text-sm mt-2 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const priceHistory = generatePriceHistory(asset.price);
  const sentimentHistory = generateSentimentHistory();
  const assetLogs = mockSentimentLogs.filter((l) => l.assetId === asset.id);

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light border border-black/5 hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-text-primary" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl text-white text-sm font-bold shadow-sm",
              symbolColors[asset.symbol] || "bg-slate-500"
            )}
          >
            {asset.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">
                {asset.name}
              </h1>
              <span className="text-sm text-text-secondary">
                {asset.symbol}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <SentimentBadge score={asset.sentimentScore} size="sm" />
            </div>
          </div>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light border border-black/5 hover:bg-black/5 transition-colors">
          <Star
            className={cn(
              "h-5 w-5",
              asset.isWatchlisted
                ? "fill-warning text-warning"
                : "text-text-secondary"
            )}
          />
        </button>
      </div>

      {/* Price Overview */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div>
            <p className="text-sm text-text-secondary mb-1">Current Price</p>
            <p className="text-3xl font-extrabold text-text-primary">
              {formatCurrency(asset.price)}
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold",
              asset.change24h >= 0
                ? "bg-pastel-green text-primary"
                : "bg-pastel-red text-danger"
            )}
          >
            {asset.change24h >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {asset.change24h >= 0 ? "+" : ""}
            {asset.change24h.toFixed(2)}% (24h)
          </div>
        </div>

        <PriceChart
          data={priceHistory}
          color={asset.change24h >= 0 ? "#10B981" : "#EF4444"}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-pastel-green border border-primary/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Sentiment
            </span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">
            {asset.sentimentScore > 0 ? "+" : ""}
            {asset.sentimentScore.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-pastel-blue border border-blue-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Volume 24h
            </span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">
            {formatCompactNumber(asset.volume24h)}
          </p>
        </div>
        <div className="rounded-2xl bg-pastel-yellow border border-yellow-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Market Cap
            </span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">
            {formatCompactNumber(asset.marketCap)}
          </p>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              News Count
            </span>
          </div>
          <p className="text-xl font-extrabold text-text-primary">
            {assetLogs.length > 0 ? assetLogs.length * 47 : 128}
          </p>
        </div>
      </div>

      {/* Sentiment Analysis & News */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sentiment History */}
        <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-1">
            Sentiment History
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            FinBERT analysis over 30 days
          </p>
          <SentimentChart data={sentimentHistory} />
        </div>

        {/* News Feed */}
        <div className="rounded-2xl bg-surface-light border border-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/5">
            <h2 className="text-lg font-bold text-text-primary">
              Recent News & Analysis
            </h2>
            <p className="text-sm text-text-secondary">
              AI-powered sentiment signals
            </p>
          </div>
          <div className="divide-y divide-black/5">
            {(assetLogs.length > 0 ? assetLogs : mockSentimentLogs.slice(0, 4)).map(
              (log) => {
                const isPositive = log.score >= 0.3;
                const isNegative = log.score <= -0.3;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 px-6 py-4"
                  >
                    <div
                      className={cn(
                        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isPositive
                          ? "bg-pastel-green"
                          : isNegative
                            ? "bg-pastel-red"
                            : "bg-pastel-yellow"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isPositive
                            ? "text-primary"
                            : isNegative
                              ? "text-danger"
                              : "text-warning"
                        )}
                      >
                        {log.score > 0 ? "+" : ""}
                        {log.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary leading-snug">
                        {log.headline}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {log.source} •{" "}
                        {new Date(log.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
