"use client";

import { CheckCircle2, Loader2, Zap, Rss, Brain, Database, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RefreshState, PipelineStage } from "@/hooks/usePipelineRefresh";

const STAGES: { id: PipelineStage; label: string; icon: React.ElementType; duration: number }[] = [
  { id: "prices",  label: "Fiyatlar",  icon: Zap,      duration: 12 },
  { id: "news",    label: "Haberler",  icon: Rss,      duration: 18 },
  { id: "finbert", label: "FinBERT",   icon: Brain,    duration: 25 },
  { id: "saving",  label: "Kayıt",     icon: Database, duration: 10 },
];

const TOTAL_DURATION = STAGES.reduce((s, st) => s + st.duration, 0);

function stageIndex(stage: PipelineStage): number {
  return STAGES.findIndex((s) => s.id === stage);
}

function calcProgress(stage: PipelineStage, elapsed: number): number {
  const idx = stageIndex(stage);
  const completedDuration = STAGES.slice(0, idx).reduce((s, st) => s + st.duration, 0);
  const currentStage = STAGES[idx];
  const withinStage = Math.min(elapsed - completedDuration, currentStage.duration);
  const progress = (completedDuration + withinStage) / TOTAL_DURATION;
  return Math.min(Math.round(progress * 100), 99);
}

interface Props {
  state: RefreshState;
}

export function PipelineProgressPanel({ state }: Props) {
  if (state.kind !== "running" && state.kind !== "done") return null;

  const isDone = state.kind === "done";

  if (isDone) {
    return (
      <div className="pipeline-panel fixed bottom-6 right-6 z-50 w-80">
        <div className="glass-card rounded-2xl p-5 border border-primary/30 shadow-[0_0_32px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <PartyPopper className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary">Veriler güncellendi!</p>
              <p className="text-xs text-text-secondary">Tüm fiyatlar ve haberler yenilendi</p>
            </div>
            <span className="text-lg font-extrabold text-primary">✓</span>
          </div>
          {/* Full bar */}
          <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-full rounded-full bg-linear-to-r from-primary/60 to-primary" />
          </div>
          <div className="flex justify-between mt-2">
            {STAGES.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-medium text-primary">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { stage, elapsedSeconds } = state;
  const progress = calcProgress(stage, elapsedSeconds);
  const activeIdx = stageIndex(stage);

  return (
    <div className="pipeline-panel fixed bottom-6 right-6 z-50 w-80">
      <div className="glass-card rounded-2xl p-5 glow-green">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Pipeline Çalışıyor</p>
            <p className="text-xs text-text-secondary">{elapsedSeconds}sn geçti</p>
          </div>
          <span className="ml-auto text-sm font-bold text-primary">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary/60 to-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-0 h-full w-8 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-[shimmer_1.5s_ease-in-out_infinite]"
            style={{ left: `calc(${progress}% - 16px)` }}
          />
        </div>

        {/* Stages */}
        <div className="flex items-center justify-between">
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < activeIdx;
            const isActive    = idx === activeIdx;

            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300",
                    isCompleted ? "bg-primary/20 text-primary"       :
                    isActive    ? "bg-primary/30 text-primary ring-1 ring-primary/40 animate-pulse" :
                                  "bg-white/5 text-text-secondary"
                  )}
                >
                  {isCompleted
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <Icon className={cn("h-4 w-4", isActive && "animate-pulse")} />
                  }
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isCompleted ? "text-primary"      :
                    isActive    ? "text-text-primary" :
                                  "text-text-secondary"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stage description */}
        <p className="mt-3 text-[11px] text-text-secondary text-center leading-snug">
          {stage === "prices"  && "Binance'den canlı fiyatlar çekiliyor…"}
          {stage === "news"    && "RSS ve Reddit'ten haberler toplanıyor…"}
          {stage === "finbert" && "FinBERT ile NLP analizi yapılıyor (~30sn)"}
          {stage === "saving"  && "Sonuçlar veritabanına kaydediliyor…"}
        </p>
      </div>
    </div>
  );
}
