"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Search } from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { MiniChart } from "@/components/ui/MiniChart";
import type { CryptoAsset } from "@/lib/mock-data";

const symbolColors: Record<string, string> = {
  BTC: "bg-orange-500", ETH: "bg-indigo-500", SOL: "bg-purple-500",
  ADA: "bg-blue-500",   XRP: "bg-slate-700",  DOGE: "bg-yellow-500",
  AVAX: "bg-red-500",   DOT: "bg-pink-500",
};

export function CryptoTable({ assets }: { assets: CryptoAsset[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.symbol.toLowerCase().includes(query.toLowerCase())
      )
    : assets;

  return (
    <div className="rounded-2xl bg-surface-light border border-black/5 overflow-hidden">
      {/* Header + search */}
      <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Cryptocurrency Overview</h2>
          <p className="text-sm text-text-secondary">Real-time prices and sentiment analysis</p>
        </div>
        <div className="relative w-44 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl bg-bg-light py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 border-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Asset</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">24h</th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Market Cap</th>
              <th className="hidden md:table-cell px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary">Chart</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary">Sentiment</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-text-secondary">
                  &ldquo;{query}&rdquo; için sonuç bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/crypto/${asset.id}`} className="flex items-center gap-3 group">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm",
                        symbolColors[asset.symbol] || "bg-slate-500")}>
                        {asset.symbol.slice(0, 4)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{asset.name}</p>
                        <p className="text-xs text-text-secondary">{asset.symbol}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-bold text-text-primary">{formatCurrency(asset.price)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn("text-sm font-bold", asset.change24h >= 0 ? "text-primary" : "text-danger")}>
                      {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4 text-right">
                    <span className="text-sm text-text-secondary">{formatCompactNumber(asset.marketCap)}</span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4">
                    <div className="flex justify-center">
                      <MiniChart data={asset.sparkline} color={asset.change24h >= 0 ? "#10B981" : "#EF4444"} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <SentimentBadge score={asset.sentimentScore} size="sm" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/crypto/${asset.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 transition-colors" title="Detay">
                      <Star className={cn("h-4 w-4", asset.isWatchlisted ? "fill-warning text-warning" : "text-text-secondary")} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
