"use client";

import { TrendingUp, TrendingDown, Minus, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiCorrelation } from "@/lib/api";

const STRENGTH_LABEL: Record<string, string> = {
  strong: "Güçlü",
  moderate: "Orta",
  weak: "Zayıf",
};

function strengthOf(r: number) {
  const abs = Math.abs(r);
  if (abs >= 0.5) return "strong";
  if (abs >= 0.3) return "moderate";
  return "weak";
}

function strengthColor(r: number) {
  const s = strengthOf(r);
  if (s === "strong") return r > 0 ? "text-primary" : "text-danger";
  if (s === "moderate") return "text-warning";
  return "text-text-secondary";
}

function barColor(r: number | null) {
  if (r === null) return "bg-white/10";
  if (r >= 0.3) return "bg-primary";
  if (r <= -0.3) return "bg-danger";
  return "bg-warning";
}

interface Props {
  data: ApiCorrelation;
}

export function CorrelationCard({ data }: Props) {
  const { symbol, sufficient_data, message, lags, best_lag, interpretation, sample_size } = data;

  const maxAbs = lags.length
    ? Math.max(...lags.map((l) => Math.abs(l.correlation ?? 0)), 0.01)
    : 1;

  return (
    <div className="rounded-2xl border border-white/8 bg-surface-card p-6 space-y-5">
      {/* Başlık */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
          <FlaskConical className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">Korelasyon Analizi</p>
          <p className="text-xs text-text-secondary">Sentiment → Fiyat (lag etkisi)</p>
        </div>
        <span className="ml-auto text-xs text-text-secondary/60">{sample_size} veri noktası</span>
      </div>

      {!sufficient_data ? (
        <p className="text-sm text-text-secondary">{message ?? "Yeterli veri yok."}</p>
      ) : (
        <>
          {/* Ana bulgu */}
          {best_lag && best_lag.correlation !== null && (
            <div className={cn(
              "rounded-xl p-4 border",
              strengthOf(best_lag.correlation) === "strong"
                ? best_lag.correlation > 0
                  ? "bg-primary/8 border-primary/20"
                  : "bg-danger/8 border-danger/20"
                : "bg-white/4 border-white/8"
            )}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {best_lag.correlation > 0.05
                    ? <TrendingUp className="h-5 w-5 text-primary" />
                    : best_lag.correlation < -0.05
                    ? <TrendingDown className="h-5 w-5 text-danger" />
                    : <Minus className="h-5 w-5 text-text-secondary" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary leading-snug">{interpretation}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn("text-xs font-bold", strengthColor(best_lag.correlation))}>
                      {STRENGTH_LABEL[strengthOf(best_lag.correlation)]} korelasyon
                    </span>
                    <span className="text-xs text-text-secondary/50">·</span>
                    <span className={cn("text-xs font-bold tabular-nums", strengthColor(best_lag.correlation))}>
                      r = {best_lag.correlation > 0 ? "+" : ""}{best_lag.correlation.toFixed(3)}
                    </span>
                    <span className="text-xs text-text-secondary/50">·</span>
                    <span className="text-xs text-text-secondary">
                      {best_lag.lag_hours}s lag, n={best_lag.sample_size}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lag bazında bar chart */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">
              Lag'a Göre Korelasyon
            </p>
            <div className="space-y-2">
              {lags.map((lag) => {
                const r = lag.correlation;
                const pct = r !== null ? (Math.abs(r) / maxAbs) * 100 : 0;
                const isBest = best_lag?.lag_hours === lag.lag_hours;
                return (
                  <div key={lag.lag_hours} className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 text-right text-xs tabular-nums shrink-0",
                      isBest ? "font-bold text-text-primary" : "text-text-secondary"
                    )}>
                      {lag.lag_hours}s
                    </span>

                    {/* Bar — ortadan büyüyor (negatif sola, pozitif sağa) */}
                    <div className="flex-1 h-5 relative flex items-center">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/8" />
                      {r !== null && (
                        <>
                          {r >= 0 ? (
                            <div
                              className={cn("absolute top-1/2 -translate-y-1/2 h-3 rounded-r-full transition-all", barColor(r), isBest && "h-4")}
                              style={{ left: "50%", width: `${pct / 2}%`, minWidth: r !== 0 ? "2px" : 0 }}
                            />
                          ) : (
                            <div
                              className={cn("absolute top-1/2 -translate-y-1/2 h-3 rounded-l-full transition-all", barColor(r), isBest && "h-4")}
                              style={{ right: "50%", width: `${pct / 2}%`, minWidth: "2px" }}
                            />
                          )}
                          {/* Zero marker */}
                          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-px bg-white/15" />
                        </>
                      )}
                    </div>

                    <span className={cn(
                      "w-14 text-right text-xs tabular-nums shrink-0",
                      r === null ? "text-text-secondary/30"
                        : isBest ? "font-bold " + strengthColor(r)
                        : strengthColor(r)
                    )}>
                      {r !== null ? `${r > 0 ? "+" : ""}${r.toFixed(3)}` : "—"}
                    </span>
                    <span className="w-6 text-right text-[10px] text-text-secondary/40 shrink-0">
                      {lag.sample_size > 0 ? `n${lag.sample_size}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Eksen açıklaması */}
            <div className="flex justify-between text-[10px] text-text-secondary/40 px-9">
              <span>← Negatif korelasyon</span>
              <span>0</span>
              <span>Pozitif korelasyon →</span>
            </div>
          </div>

          {/* Güven notu */}
          <p className="text-[11px] text-text-secondary/50 leading-relaxed border-t border-white/5 pt-3">
            Korelasyon, sentiment kaydından belirtilen saat sonraki fiyat değişimiyle hesaplanmıştır.
            {sample_size < 10 && " Az veri nedeniyle güven aralığı geniştir; daha fazla pipeline çalıştıkça hassaslaşır."}
          </p>
        </>
      )}
    </div>
  );
}
