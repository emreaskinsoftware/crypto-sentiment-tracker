"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { CryptoAsset } from "@/lib/mock-data";

interface TopMoversProps {
  assets: CryptoAsset[];
}

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

export function TopMovers({ assets }: TopMoversProps) {
  const sorted = [...assets].sort(
    (a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)
  );
  const topGainers = sorted.filter((a) => a.change24h > 0).slice(0, 3);
  const topLosers = sorted.filter((a) => a.change24h < 0).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Gainers */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-text-primary">Top Gainers</h3>
        </div>
        <div className="space-y-3">
          {topGainers.map((asset) => (
            <Link
              key={asset.id}
              href={`/crypto/${asset.id}`}
              className="flex items-center gap-3 rounded-xl p-3 bg-pastel-green/50 border border-primary/5 hover:scale-[1.02] transition-transform"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold",
                  symbolColors[asset.symbol] || "bg-slate-500"
                )}
              >
                {asset.symbol}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text-primary">
                  {asset.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatCurrency(asset.price)}
                </p>
              </div>
              <span className="text-sm font-bold text-primary">
                +{asset.change24h.toFixed(2)}%
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-4 w-4 text-danger" />
          <h3 className="text-sm font-bold text-text-primary">Top Losers</h3>
        </div>
        <div className="space-y-3">
          {topLosers.map((asset) => (
            <Link
              key={asset.id}
              href={`/crypto/${asset.id}`}
              className="flex items-center gap-3 rounded-xl p-3 bg-pastel-red/50 border border-danger/5 hover:scale-[1.02] transition-transform"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold",
                  symbolColors[asset.symbol] || "bg-slate-500"
                )}
              >
                {asset.symbol}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text-primary">
                  {asset.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatCurrency(asset.price)}
                </p>
              </div>
              <span className="text-sm font-bold text-danger">
                {asset.change24h.toFixed(2)}%
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
