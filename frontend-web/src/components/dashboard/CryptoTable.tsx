"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Star, Search } from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { MiniChart } from "@/components/ui/MiniChart";
import { fetchLivePrices } from "@/lib/api";
import type { CryptoAsset } from "@/lib/mock-data";

const POLL_INTERVAL = 30_000;

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


export function CryptoTable({ assets: initialAssets }: { assets: CryptoAsset[] }) {
  const [assets, setAssets] = useState<CryptoAsset[]>(initialAssets);
  const [query, setQuery] = useState("");
  // symbol → "up" | "down" | null
  const [flashing, setFlashing] = useState<Record<string, "up" | "down">>({});
  const prevPrices = useRef<Record<string, number>>({});

  const applyUpdates = useCallback((fresh: { symbol: string; price: number; change_24h: number }[]) => {
    const prev = prevPrices.current;
    const newFlash: Record<string, "up" | "down"> = {};

    fresh.forEach((a) => {
      const old = prev[a.symbol];
      if (old !== undefined && old !== a.price) {
        newFlash[a.symbol] = a.price > old ? "up" : "down";
      }
      prev[a.symbol] = a.price;
    });

    setAssets((current) =>
      current.map((asset) => {
        const updated = fresh.find((a) => a.symbol === asset.symbol);
        if (!updated) return asset;
        return { ...asset, price: updated.price, change24h: updated.change_24h };
      })
    );

    if (Object.keys(newFlash).length > 0) {
      setFlashing(newFlash);
      setTimeout(() => setFlashing({}), 950);
    }
  }, []);

  // İlk yükleme — önceki fiyatları başlat
  useEffect(() => {
    initialAssets.forEach((a) => { prevPrices.current[a.symbol] = a.price; });
  }, [initialAssets]);

  // 30 saniyelik polling — Binance'den canlı fiyat, DB'ye yazmaz
  useEffect(() => {
    const tick = async () => {
      try {
        const fresh = await fetchLivePrices();
        if (fresh.length > 0) applyUpdates(fresh);
      } catch { /* sessiz hata */ }
    };

    const id = setInterval(tick, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [applyUpdates]);

  const filtered = query.trim()
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.symbol.toLowerCase().includes(query.toLowerCase())
      )
    : assets;

  return (
    <div className="rounded-2xl bg-surface-card border border-white/5 overflow-hidden">
      {/* Header + search */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-text-primary">Kripto Varlıklar</h2>
          <p className="text-xs text-text-secondary mt-0.5">Canlı fiyatlar ve sentiment skorları</p>
        </div>
        <div className="relative w-40 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-secondary/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl bg-white/3 border border-white/5 py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/30 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Varlık</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Fiyat</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">24s</th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Piyasa Değ.</th>
              <th className="hidden md:table-cell px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Grafik</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Sentiment</th>
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
              filtered.map((asset) => {
                const flash = flashing[asset.symbol];
                return (
                  <tr
                    key={asset.id}
                    className="border-b border-white/4 last:border-b-0 hover:bg-white/2.5 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <Link href={`/crypto/${asset.id}`} className="flex items-center gap-3 group">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-[10px] font-extrabold",
                            symbolColors[asset.symbol] || "bg-slate-600/80"
                          )}
                        >
                          {asset.symbol.slice(0, 4)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                            {asset.name}
                          </p>
                          <p className="text-[11px] text-text-secondary">{asset.symbol}</p>
                        </div>
                      </Link>
                    </td>

                    {/* Fiyat — flash burada */}
                    <td
                      className={cn(
                        "px-4 py-3.5 text-right rounded-sm transition-colors",
                        flash === "up" && "price-flash-up",
                        flash === "down" && "price-flash-down"
                      )}
                    >
                      <span className="text-sm font-bold text-text-primary tabular-nums">
                        {formatCurrency(asset.price)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          asset.change24h >= 0 ? "text-primary" : "text-danger"
                        )}
                      >
                        {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3.5 text-right">
                      <span className="text-sm text-text-secondary">{formatCompactNumber(asset.marketCap)}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3.5">
                      <div className="flex justify-center">
                        <MiniChart
                          data={asset.sparkline}
                          color={asset.change24h >= 0 ? "#10B981" : "#EF4444"}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center">
                        <SentimentBadge score={asset.sentimentScore} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/crypto/${asset.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/8 transition-colors"
                        title="Detay"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            asset.isWatchlisted ? "fill-warning text-warning" : "text-text-secondary/50"
                          )}
                        />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
