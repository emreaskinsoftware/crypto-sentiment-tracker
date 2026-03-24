"use client";

import { cn } from "@/lib/utils";
import type { SentimentLog } from "@/lib/mock-data";

interface SentimentFeedProps {
  logs: SentimentLog[];
}

export function SentimentFeed({ logs }: SentimentFeedProps) {
  return (
    <div className="rounded-2xl bg-surface-light border border-black/5 overflow-hidden">
      <div className="px-6 py-4 border-b border-black/5">
        <h2 className="text-lg font-bold text-text-primary">
          Latest Sentiment Signals
        </h2>
        <p className="text-sm text-text-secondary">
          AI-analyzed news and social media
        </p>
      </div>

      <div className="divide-y divide-black/5">
        {logs.map((log) => {
          const isPositive = log.score >= 0.3;
          const isNegative = log.score <= -0.3;

          return (
            <div
              key={log.id}
              className="flex items-start gap-4 px-6 py-4 hover:bg-black/[0.02] transition-colors"
            >
              <div
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  isPositive
                    ? "bg-primary"
                    : isNegative
                      ? "bg-danger"
                      : "bg-warning"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
                  {log.headline}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-text-secondary">
                    {log.source}
                  </span>
                  <span className="text-xs text-text-secondary/40">•</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isPositive
                        ? "text-primary"
                        : isNegative
                          ? "text-danger"
                          : "text-warning"
                    )}
                  >
                    {log.score > 0 ? "+" : ""}
                    {log.score.toFixed(2)}
                  </span>
                  <span className="text-xs text-text-secondary/40">•</span>
                  <span className="text-xs text-text-secondary">
                    {new Date(log.timestamp).toLocaleTimeString("en-US", {
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
