"use client";

import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import type { CryptoAsset } from "@/lib/mock-data";

function Column({
  title,
  assets,
  rising,
}: {
  title: string;
  assets: CryptoAsset[];
  rising: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-ink/12 px-4 py-2.5">
        <h3 className="font-label text-[11px] font-700 uppercase tracking-[0.2em]">
          {title}
        </h3>
        <span className="font-data text-[10px] text-ink-faint">24 saat</span>
      </div>

      {assets.length === 0 ? (
        <p className="px-4 py-6 font-data text-[11px] text-ink-soft">
          Bu yönde hareket eden kanal yok.
        </p>
      ) : (
        assets.map((asset, i) => (
          <Link
            key={asset.id}
            href={`/crypto/${asset.id}`}
            className="feed-in flex items-baseline gap-3 border-b border-ink/8 px-4 py-2.5 last:border-b-0 hover:bg-grid-fine/40"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <span className="font-data text-[13px] font-500 text-ink">
              {asset.symbol}
            </span>
            <span className="font-label text-[11px] text-ink-soft truncate">
              {asset.name}
            </span>
            <span className="ml-auto shrink-0 font-data text-[11px] tabular-nums text-ink-faint">
              {formatCurrency(asset.price)}
            </span>
            <span
              className={cn(
                "w-16 shrink-0 text-right font-data text-[13px] tabular-nums",
                rising ? "text-trace-alt" : "text-trace"
              )}
            >
              {rising ? "+" : ""}
              {asset.change24h.toFixed(2)}%
            </span>
          </Link>
        ))
      )}
    </div>
  );
}

export function TopMovers({ assets }: { assets: CryptoAsset[] }) {
  const sorted = [...assets].sort(
    (a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)
  );

  return (
    <section className="grid grid-cols-1 border border-ink/15 bg-paper/80 md:grid-cols-2">
      <Column
        title="Yükselen uçlar"
        rising
        assets={sorted.filter((a) => a.change24h > 0).slice(0, 3)}
      />
      <div className="border-t border-ink/12 md:border-l md:border-t-0">
        <Column
          title="Düşen uçlar"
          rising={false}
          assets={sorted.filter((a) => a.change24h < 0).slice(0, 3)}
        />
      </div>
    </section>
  );
}
