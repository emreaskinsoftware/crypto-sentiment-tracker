"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

export interface TracePoint {
  t: string;
  sentiment: number | null;
  price: number;
}

interface PenTraceProps {
  symbol: string;
  name: string;
  points: TracePoint[];
  /** Şeridin kapsadığı zaman aralığı; künyede yazılır. */
  window: "24h" | "7d";
}

const W = 1000;
const H = 190;
const PAD_T = 18;
const PAD_B = 26;

/** Sayıları [0,1] aralığına indirger; düz seri ortada durur. */
function normalise(values: number[]): (v: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) return () => 0.5;
  return (v) => (v - min) / span;
}

function toPath(
  samples: { x: number; v: number }[],
  project: (v: number) => number
): string {
  return samples
    .map((s, i) => {
      const y = PAD_T + (1 - project(s.v)) * (H - PAD_T - PAD_B);
      return `${i === 0 ? "M" : "L"}${s.x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PenTrace({ symbol, name, points, window }: PenTraceProps) {
  const view = useMemo(() => {
    if (points.length < 2) return null;

    const step = W / (points.length - 1);
    const withX = points.map((p, i) => ({ ...p, x: i * step }));

    // Duygu kanalı — yalnızca ölçüm yapılmış noktalar
    const scored = withX.filter(
      (p): p is typeof p & { sentiment: number } => p.sentiment !== null
    );

    // Duygu ekseni her zaman −1…+1: sıfır çizgisi sabit kalsın
    const sentimentAt = (v: number) => (v + 1) / 2;
    const priceAt = normalise(withX.map((p) => p.price));

    const zeroY = PAD_T + (1 - sentimentAt(0)) * (H - PAD_T - PAD_B);
    const last = scored.at(-1) ?? null;
    const lastPrice = withX.at(-1)!;

    return {
      sentimentPath:
        scored.length >= 2
          ? toPath(
              scored.map((p) => ({ x: p.x, v: p.sentiment })),
              sentimentAt
            )
          : null,
      pricePath: toPath(
        withX.map((p) => ({ x: p.x, v: p.price })),
        priceAt
      ),
      zeroY,
      penX: last?.x ?? W,
      penY: last
        ? PAD_T + (1 - sentimentAt(last.sentiment)) * (H - PAD_T - PAD_B)
        : zeroY,
      lastSentiment: last?.sentiment ?? null,
      lastPrice: lastPrice.price,
      firstTime: withX[0].t,
      lastTime: lastPrice.t,
    };
  }, [points]);

  const hasSentiment = view?.sentimentPath != null;

  const stamp = (iso: string) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (window === "24h") return time;
    // Haftalık pencerede saat tek başına ayırt etmiyor
    return `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${time}`;
  };

  return (
    <section className="overflow-hidden border border-ink/15 bg-paper/80">
      {/* Kanal künyesi */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-ink/12 px-4 py-2.5">
        <h2 className="font-label text-[11px] font-700 uppercase tracking-[0.2em]">
          Şerit kaydı
        </h2>
        <p className="font-data text-[11px] text-ink-soft">
          {symbol}
          {name && name !== symbol ? ` · ${name}` : ""} ·{" "}
          {window === "7d" ? "son 7 gün" : "son 24 saat"}
        </p>
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-data text-[10px] text-ink-soft">
            <span className="inline-block h-[2px] w-4 bg-trace" /> duygu
            {!hasSentiment && <em className="not-italic text-ink-faint">(ölçüm yok)</em>}
          </span>
          <span className="flex items-center gap-1.5 font-data text-[10px] text-ink-soft">
            <span className="inline-block h-[2px] w-4 bg-trace-alt" /> fiyat
          </span>
        </div>
      </div>

      {!view ? (
        <p className="px-4 py-14 text-center font-data text-xs text-ink-soft">
          Henüz yeterli örnek kaydedilmedi. İlk çevrim tamamlanınca şerit
          buradan akmaya başlar.
        </p>
      ) : (
        <>
          <div className="relative">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full"
              style={{ height: H }}
              role="img"
              aria-label={`${symbol} ${window === "7d" ? "son 7 günde" : "son 24 saatte"} duygu ve fiyat izi`}
              preserveAspectRatio="none"
            >
              {/* Sıfır çizgisi — duygunun nötr ekseni */}
              <line
                x1="0"
                x2={W}
                y1={view.zeroY}
                y2={view.zeroY}
                stroke="var(--color-ink)"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.35"
                vectorEffect="non-scaling-stroke"
              />

              {/* Kanal 2 — fiyat, soluk mürekkep mavisi */}
              <path
                d={view.pricePath}
                fill="none"
                stroke="var(--color-trace-alt)"
                strokeWidth="1.25"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.85"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                className="pen-trace"
                style={{ "--trace-length": 1 } as React.CSSProperties}
              />

              {/* Kanal 1 — duygu, kalem kırmızısı */}
              {view.sentimentPath && (
                <path
                  d={view.sentimentPath}
                  fill="none"
                  stroke="var(--color-trace)"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className="pen-trace"
                  style={{ "--trace-length": 1 } as React.CSSProperties}
                />
              )}

              {/* Kalem ucu */}
              <g className="pen-tip">
                <line
                  x1={view.penX}
                  x2={view.penX}
                  y1={PAD_T - 4}
                  y2={H - PAD_B + 4}
                  stroke="var(--color-trace)"
                  strokeWidth="1"
                  opacity="0.4"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={view.penX}
                  cy={view.penY}
                  r="3"
                  fill="var(--color-trace)"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            </svg>

            {/* Sıfır etiketi — SVG gerildiği için dışarıda tutuluyor */}
            <span
              className="pointer-events-none absolute left-1.5 font-data text-[9px] text-ink-faint"
              style={{ top: view.zeroY - 6 }}
            >
              0.00
            </span>
          </div>

          {/* Okuma bandı */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink/12 px-4 py-3">
            <div className="flex gap-8">
              <div>
                <p className="font-label text-[9px] font-600 uppercase tracking-[0.18em] text-ink-soft">
                  Duygu
                </p>
                <p className="font-data text-2xl leading-tight tabular-nums text-trace">
                  {view.lastSentiment === null
                    ? "—"
                    : `${view.lastSentiment > 0 ? "+" : ""}${view.lastSentiment.toFixed(2)}`}
                </p>
              </div>
              <div>
                <p className="font-label text-[9px] font-600 uppercase tracking-[0.18em] text-ink-soft">
                  Fiyat
                </p>
                <p className="font-data text-2xl leading-tight tabular-nums text-trace-alt">
                  {formatCurrency(view.lastPrice)}
                </p>
              </div>
            </div>
            <p className="font-data text-[10px] text-ink-faint tabular-nums">
              {stamp(view.firstTime)} → {stamp(view.lastTime)}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
