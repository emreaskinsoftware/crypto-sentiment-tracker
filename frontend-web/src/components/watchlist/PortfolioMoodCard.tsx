"use client";

import { TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiPortfolioMood } from "@/lib/api";

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  const isPos = score >= 0.3;
  const isNeg = score <= -0.3;
  const color = isPos ? "var(--color-trace-alt)" : isNeg ? "var(--color-trace)" : "var(--color-ink-faint)";

  return (
    <div className="relative h-1.5 rounded-full overflow-visible" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="absolute inset-0 rounded-full opacity-25"
        style={{ background: "linear-gradient(to right,var(--color-trace) 0%,var(--color-ink-faint) 50%,var(--color-trace-alt) 100%)" }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-ink/12 shadow"
        style={{ left: `${pct}%`, background: color, transition: "left 0.4s ease" }}
      />
    </div>
  );
}

interface Props {
  mood: ApiPortfolioMood;
}

export function PortfolioMoodCard({ mood }: Props) {
  const { current_avg, week_ago_avg, change_pct, direction, current_label, asset_count, assets } = mood;

  const labelColor =
    current_label === "Bullish" ? "text-trace-alt" :
    current_label === "Bearish" ? "text-trace" : "text-ink-soft";

  const labelBg =
    current_label === "Bullish" ? "bg-trace-alt/10 border-trace-alt/20" :
    current_label === "Bearish" ? "bg-trace/10 border-trace/20" : "bg-ink-faint/10 border-ink/25/20";

  const directionIcon =
    direction === "better" ? <TrendingUp className="h-4 w-4 text-trace-alt" /> :
    direction === "worse"  ? <TrendingDown className="h-4 w-4 text-trace" /> :
                             <Minus className="h-4 w-4 text-ink-soft" />;

  const changeText = () => {
    if (change_pct === null || direction === "unknown") return "Geçen hafta verisi yok";
    if (direction === "same") return "Geçen haftayla aynı seviyede";
    const abs = Math.abs(change_pct);
    return direction === "better"
      ? `Geçen haftaya göre %${abs} daha iyimser`
      : `Geçen haftaya göre %${abs} daha kötümser`;
  };

  return (
    <div className="border border-ink/12 bg-paper p-6 space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center bg-trace-alt/10 border border-trace-alt/20">
            <Brain className="h-4.5 w-4.5 text-trace-alt" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Portföy Ruh Hali</p>
            <p className="text-xs text-ink-soft">{asset_count} varlık takip ediliyor</p>
          </div>
        </div>
        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", labelBg, labelColor)}>
          {current_label === "Bullish" ? "İyimser" : current_label === "Bearish" ? "Kötümser" : "Nötr"}
        </span>
      </div>

      {/* Ana skor */}
      {current_avg !== null ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold text-ink tabular-nums">
                {current_avg > 0 ? "+" : ""}{current_avg.toFixed(3)}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">Ortalama Sentiment Skoru</p>
            </div>
            {week_ago_avg !== null && (
              <div className="text-right">
                <p className="text-sm font-bold text-ink-soft tabular-nums">
                  {week_ago_avg > 0 ? "+" : ""}{week_ago_avg.toFixed(3)}
                </p>
                <p className="text-xs text-ink-soft/60">geçen hafta</p>
              </div>
            )}
          </div>
          <ScoreBar score={current_avg} />
          <div className="flex items-center gap-1.5 text-xs">
            {directionIcon}
            <span className={cn(
              "font-semibold",
              direction === "better" ? "text-trace-alt" :
              direction === "worse" ? "text-trace" : "text-ink-soft"
            )}>
              {changeText()}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Bu hafta için henüz sentiment verisi yok.</p>
      )}

      {/* Varlık bazında kırılım */}
      {assets.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-ink/12">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/50">Varlık Kırılımı</p>
          <div className="space-y-2">
            {assets.map((a) => {
              const s = a.current_score;
              const isPos = s !== null && s >= 0.3;
              const isNeg = s !== null && s <= -0.3;
              const color = s === null ? "text-ink-soft/40" : isPos ? "text-trace-alt" : isNeg ? "text-trace" : "text-ink-soft";
              const weekChange = a.current_score !== null && a.week_ago_score !== null
                ? a.current_score - a.week_ago_score : null;

              return (
                <div key={a.symbol} className="flex items-center gap-3">
                  <span className="w-10 text-xs font-bold text-ink-soft shrink-0">{a.symbol}</span>
                  <div className="flex-1">
                    {s !== null ? <ScoreBar score={s} /> : (
                      <div className="h-1.5 rounded-full bg-grid-fine/40" />
                    )}
                  </div>
                  <span className={cn("w-14 text-right text-xs font-bold tabular-nums shrink-0", color)}>
                    {s !== null ? `${s > 0 ? "+" : ""}${s.toFixed(3)}` : "—"}
                  </span>
                  {weekChange !== null && (
                    <span className={cn(
                      "w-12 text-right text-[10px] tabular-nums shrink-0",
                      weekChange > 0.01 ? "text-trace-alt" : weekChange < -0.01 ? "text-trace" : "text-ink-soft/50"
                    )}>
                      {weekChange > 0 ? "↑" : weekChange < 0 ? "↓" : "–"}
                      {Math.abs(weekChange).toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
