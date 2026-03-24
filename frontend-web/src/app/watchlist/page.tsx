"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Bell,
  Trash2,
  Plus,
} from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { MiniChart } from "@/components/ui/MiniChart";
import { mockAssets, type CryptoAsset } from "@/lib/mock-data";

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

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<CryptoAsset[]>(
    mockAssets.filter((a) => a.isWatchlisted)
  );

  const removeFromWatchlist = (id: string) => {
    setWatchlist((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Watchlist</h1>
          <p className="text-sm text-text-secondary mt-1">
            Track your favorite cryptocurrencies
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      {/* Watchlist Summary */}
      <div className="rounded-2xl bg-pastel-green border border-primary/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-5 w-5 fill-warning text-warning" />
          <span className="text-sm font-bold text-text-primary">
            Portfolio Sentiment Overview
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-secondary">Assets Tracked</p>
            <p className="text-xl font-extrabold text-text-primary">
              {watchlist.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Avg Sentiment</p>
            <p className="text-xl font-extrabold text-primary">
              +
              {(
                watchlist.reduce((s, a) => s + a.sentimentScore, 0) /
                (watchlist.length || 1)
              ).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">24h Avg Change</p>
            <p
              className={cn(
                "text-xl font-extrabold",
                watchlist.reduce((s, a) => s + a.change24h, 0) >= 0
                  ? "text-primary"
                  : "text-danger"
              )}
            >
              {(
                watchlist.reduce((s, a) => s + a.change24h, 0) /
                (watchlist.length || 1)
              ).toFixed(2)}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Watchlist Cards */}
      {watchlist.length === 0 ? (
        <div className="rounded-2xl bg-surface-light border-2 border-dashed border-black/10 p-12 text-center">
          <Star className="h-12 w-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">
            No assets in watchlist
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Add cryptocurrencies to start tracking
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {watchlist.map((asset) => (
            <div
              key={asset.id}
              className="rounded-2xl bg-surface-light border border-black/5 p-5 hover:shadow-md transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <Link
                  href={`/crypto/${asset.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm",
                      symbolColors[asset.symbol] || "bg-slate-500"
                    )}
                  >
                    {asset.symbol}
                  </div>
                  <div>
                    <p className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                      {asset.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {asset.symbol}
                    </p>
                  </div>
                </Link>
                <div className="flex gap-1">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pastel-blue transition-colors">
                    <Bell className="h-4 w-4 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => removeFromWatchlist(asset.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pastel-red transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                  </button>
                </div>
              </div>

              {/* Price & Change */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-2xl font-extrabold text-text-primary">
                    {formatCurrency(asset.price)}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-1 text-sm font-bold",
                      asset.change24h >= 0 ? "text-primary" : "text-danger"
                    )}
                  >
                    {asset.change24h >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {asset.change24h >= 0 ? "+" : ""}
                    {asset.change24h.toFixed(2)}%
                  </div>
                </div>
                <MiniChart
                  data={asset.sparkline}
                  color={asset.change24h >= 0 ? "#10B981" : "#EF4444"}
                  width={100}
                  height={40}
                />
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider">
                    Sentiment
                  </p>
                  <SentimentBadge score={asset.sentimentScore} size="sm" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider">
                    Market Cap
                  </p>
                  <p className="text-xs font-bold text-text-primary">
                    {formatCompactNumber(asset.marketCap)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
