"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { CryptoAsset } from "@/lib/mock-data";

const symbolColors: Record<string, string> = {
  BTC:  "bg-orange-500/80",
  ETH:  "bg-indigo-500/80",
  SOL:  "bg-purple-500/80",
  ADA:  "bg-blue-500/80",
  XRP:  "bg-slate-600/80",
  DOGE: "bg-yellow-500/80",
  AVAX: "bg-red-500/80",
  DOT:  "bg-pink-500/80",
};

function MoverCard({
  asset,
  isGainer,
}: {
  asset: CryptoAsset;
  isGainer: boolean;
}) {
  return (
    <Link
      href={`/crypto/${asset.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 border transition-all duration-150 hover:scale-[1.02] hover:-translate-y-0.5",
        isGainer
          ? "bg-primary/5 border-primary/10 hover:bg-primary/8 hover:border-primary/20"
          : "bg-danger/5 border-danger/10 hover:bg-danger/8 hover:border-danger/20"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-[10px] font-extrabold",
          symbolColors[asset.symbol] || "bg-slate-600/80"
        )}
      >
        {asset.symbol}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary truncate">{asset.name}</p>
        <p className="text-[11px] text-text-secondary">{formatCurrency(asset.price)}</p>
      </div>
      <span className={cn("text-sm font-extrabold tabular-nums shrink-0", isGainer ? "text-primary" : "text-danger")}>
        {isGainer ? "+" : ""}{asset.change24h.toFixed(2)}%
      </span>
    </Link>
  );
}

export function TopMovers({ assets }: { assets: CryptoAsset[] }) {
  const sorted = [...assets].sort(
    (a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)
  );
  const topGainers = sorted.filter((a) => a.change24h > 0).slice(0, 3);
  const topLosers  = sorted.filter((a) => a.change24h < 0).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-surface-card border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Top Gainers</h3>
          <span className="ml-auto text-[10px] font-bold text-primary/60 uppercase tracking-wider">24s</span>
        </div>
        <div className="space-y-2.5">
          {topGainers.map((asset) => (
            <MoverCard key={asset.id} asset={asset} isGainer={true} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-card border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/15">
            <TrendingDown className="h-3.5 w-3.5 text-danger" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Top Losers</h3>
          <span className="ml-auto text-[10px] font-bold text-danger/60 uppercase tracking-wider">24s</span>
        </div>
        <div className="space-y-2.5">
          {topLosers.map((asset) => (
            <MoverCard key={asset.id} asset={asset} isGainer={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
