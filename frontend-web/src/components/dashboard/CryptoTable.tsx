"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { fetchLivePrices } from "@/lib/api";
import type { CryptoAsset } from "@/lib/mock-data";

const POLL_INTERVAL = 30_000;

export function CryptoTable({ assets: initialAssets }: { assets: CryptoAsset[] }) {
  const [assets, setAssets] = useState<CryptoAsset[]>(initialAssets);
  const [query, setQuery] = useState("");
  const [marks, setMarks] = useState<Record<string, "up" | "down">>({});
  const prevPrices = useRef<Record<string, number>>({});

  const applyUpdates = useCallback(
    (fresh: { symbol: string; price: number; change_24h: number }[]) => {
      const prev = prevPrices.current;
      const next: Record<string, "up" | "down"> = {};

      fresh.forEach((a) => {
        const old = prev[a.symbol];
        if (old !== undefined && old !== a.price) {
          next[a.symbol] = a.price > old ? "up" : "down";
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

      if (Object.keys(next).length > 0) {
        setMarks(next);
        setTimeout(() => setMarks({}), 1150);
      }
    },
    []
  );

  useEffect(() => {
    initialAssets.forEach((a) => {
      prevPrices.current[a.symbol] = a.price;
    });
  }, [initialAssets]);

  useEffect(() => {
    const tick = async () => {
      try {
        const fresh = await fetchLivePrices();
        if (fresh.length > 0) applyUpdates(fresh);
      } catch {
        /* sessiz — sonraki tur tekrar dener */
      }
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
    <section className="border border-ink/15 bg-paper/80">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-ink/12 px-4 py-2.5">
        <h2 className="font-label text-[11px] font-700 uppercase tracking-[0.2em]">
          Varlık defteri
        </h2>
        <p className="font-data text-[11px] text-ink-soft">
          {assets.length} kanal · fiyat 30sn&apos;de bir
        </p>
        <label className="ml-auto flex items-center gap-2">
          <span className="sr-only">Varlık ara</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="kanal ara"
            className="w-32 border-b border-ink/25 bg-transparent pb-0.5 font-data text-[11px] text-ink placeholder:text-ink-faint focus:border-trace focus:outline-none"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink/12">
              {["Kanal", "Fiyat", "24s", "Duygu"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-4 py-2 font-label text-[9px] font-600 uppercase tracking-[0.16em] text-ink-soft",
                    i === 0 ? "text-left" : "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center font-data text-xs text-ink-soft"
                >
                  &ldquo;{query}&rdquo; için kanal yok. Sembolün tamamını veya
                  adının bir bölümünü yazın.
                </td>
              </tr>
            ) : (
              filtered.map((asset, i) => {
                const mark = marks[asset.symbol];
                const up = asset.change24h >= 0;

                return (
                  <tr
                    key={asset.id}
                    className="feed-in border-b border-ink/8 last:border-b-0 hover:bg-grid-fine/40"
                    style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/crypto/${asset.id}`} className="group flex items-baseline gap-2.5">
                        <span className="font-data text-[10px] text-ink-faint tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-data text-[13px] font-500 text-ink group-hover:text-trace">
                          {asset.symbol}
                        </span>
                        {asset.name !== asset.symbol && (
                          <span className="font-label text-[11px] text-ink-soft">
                            {asset.name}
                          </span>
                        )}
                      </Link>
                    </td>

                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-data text-[13px] tabular-nums",
                        mark === "up" && "mark-up",
                        mark === "down" && "mark-down"
                      )}
                    >
                      {formatCurrency(asset.price)}
                    </td>

                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-data text-[13px] tabular-nums",
                        up ? "text-trace-alt" : "text-trace"
                      )}
                    >
                      {up ? "+" : ""}
                      {asset.change24h.toFixed(2)}%
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        {asset.sentimentScore === null ? (
                          <span
                            className="font-data text-[11px] text-ink-faint"
                            title="Bu kanal için henüz haber ölçülmedi"
                          >
                            ölçülmedi
                          </span>
                        ) : (
                          <SentimentBadge score={asset.sentimentScore} size="sm" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
