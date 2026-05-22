"use client";

import { TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiPortfolioMood } from "@/lib/api";

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  const isPos = score >= 0.3;
  const isNeg = score <= -0.3;
  const color = isPos ? "#10B981" : isNeg ? "#EF4444" : "#F59E0B";

  return (
    <div className="relative h-1.5 rounded-full overflow-visible" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="absolute inset-0 rounded-full opacity-25"
        style={{ background: "linear-gradient(to right,#EF4444 0%,#F59E0B 50%,#10B981 100%)" }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white/80 shadow"
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
    current_label === "Bullish" ? "text-primary" :
    current_label === "Bearish" ? "text-danger" : "text-warning";

  const labelBg =
    current_label === "Bullish" ? "bg-primary/10 border-primary/20" :
    current_label === "Bearish" ? "bg-danger/10 border-danger/20" : "bg-warning/10 border-warning/20";

  const directionIcon =
    direction === "better" ? <TrendingUp className="h-4 w-4 text-primary" /> :
    direction === "worse"  ? <TrendingDown className="h-4 w-4 text-danger" /> :
                             <Minus className="h-4 w-4 text-text-secondary" />;

  const changeText = () => {
    if (change_pct === null || direction === "unknown") return "Geçen hafta verisi yok";
    if (direction === "same") return "Geçen haftayla aynı seviyede";
    const abs = Math.abs(change_pct);
    return direction === "better"
      ? `Geçen haftaya göre %${abs} daha iyimser`
      : `Geçen haftaya göre %${abs} daha kötümser`;
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-surface-card p-6 space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Brain className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Portföy Ruh Hali</p>
            <p className="text-xs text-text-secondary">{asset_count} varlık takip ediliyor</p>
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
              <p className="text-3xl font-extrabold text-text-primary tabular-nums">
                {current_avg > 0 ? "+" : ""}{current_avg.toFixed(3)}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">Ortalama Sentiment Skoru</p>
            </div>
            {week_ago_avg !== null && (
              <div className="text-right">
                <p className="text-sm font-bold text-text-secondary tabular-nums">
                  {week_ago_avg > 0 ? "+" : ""}{week_ago_avg.toFixed(3)}
                </p>
                <p className="text-xs text-text-secondary/60">geçen hafta</p>
              </div>
            )}
          </div>
          <ScoreBar score={current_avg} />
          <div className="flex items-center gap-1.5 text-xs">
            {directionIcon}
            <span className={cn(
              "font-semibold",
              direction === "better" ? "text-primary" :
              direction === "worse" ? "text-danger" : "text-text-secondary"
            )}>
              {changeText()}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">Bu hafta için henüz sentiment verisi yok.</p>
      )}

      {/* Varlık bazında kırılım */}
      {assets.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">Varlık Kırılımı</p>
          <div className="space-y-2">
            {assets.map((a) => {
              const s = a.current_score;
              const isPos = s !== null && s >= 0.3;
              const isNeg = s !== null && s <= -0.3;
              const color = s === null ? "text-text-secondary/40" : isPos ? "text-primary" : isNeg ? "text-danger" : "text-warning";
              const weekChange = a.current_score !== null && a.week_ago_score !== null
                ? a.current_score - a.week_ago_score : null;

              return (
                <div key={a.symbol} className="flex items-center gap-3">
                  <span className="w-10 text-xs font-bold text-text-secondary shrink-0">{a.symbol}</span>
                  <div className="flex-1">
                    {s !== null ? <ScoreBar score={s} /> : (
                      <div className="h-1.5 rounded-full bg-white/5" />
                    )}
                  </div>
                  <span className={cn("w-14 text-right text-xs font-bold tabular-nums shrink-0", color)}>
                    {s !== null ? `${s > 0 ? "+" : ""}${s.toFixed(3)}` : "—"}
                  </span>
                  {weekChange !== null && (
                    <span className={cn(
                      "w-12 text-right text-[10px] tabular-nums shrink-0",
                      weekChange > 0.01 ? "text-primary" : weekChange < -0.01 ? "text-danger" : "text-text-secondary/50"
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
