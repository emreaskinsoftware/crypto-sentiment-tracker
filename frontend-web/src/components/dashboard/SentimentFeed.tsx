"use client";

import { cn } from "@/lib/utils";
import type { SentimentLog } from "@/lib/mock-data";

interface SentimentFeedProps {
  logs: SentimentLog[];
}

export function SentimentFeed({ logs }: SentimentFeedProps) {
  return (
    <div className="rounded-2xl bg-surface-card border border-white/5 overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-base font-bold text-text-primary">Sentiment Sinyalleri</h2>
        <p className="text-xs text-text-secondary mt-0.5">FinBERT AI analizi</p>
      </div>

      <div className="divide-y divide-white/4">
        {logs.map((log) => {
          const isPositive = log.score >= 0.3;
          const isNegative = log.score <= -0.3;

          return (
            <div
              key={log.id}
              className="flex items-start gap-3.5 px-6 py-3.5 hover:bg-white/2.5 transition-colors"
            >
              {/* Score indicator bar */}
              <div className="mt-1.5 flex flex-col items-center gap-0.5 shrink-0">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isPositive ? "bg-primary shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                    : isNegative ? "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                    : "bg-warning shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">
                  {log.headline}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-text-secondary/70 font-medium">
                    {log.source}
                  </span>
                  <span className="text-text-secondary/30 text-[10px]">·</span>
                  <span
                    className={cn(
                      "text-[10px] font-extrabold tabular-nums",
                      isPositive ? "text-primary" : isNegative ? "text-danger" : "text-warning"
                    )}
                  >
                    {log.score > 0 ? "+" : ""}{log.score.toFixed(2)}
                  </span>
                  <span className="text-text-secondary/30 text-[10px]">·</span>
                  <span className="text-[10px] text-text-secondary/60">
                    {new Date(log.timestamp).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
