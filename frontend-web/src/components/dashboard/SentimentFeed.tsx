"use client";

import { cn } from "@/lib/utils";
import type { SentimentLog } from "@/lib/mock-data";

interface SentimentFeedProps {
  logs: SentimentLog[];
}

/**
 * Kayıt defteri. Cihazın etiketleri mono, dünyanın sözü serif —
 * ölçülen ile ölçen ayrı seslerde.
 */
export function SentimentFeed({ logs }: SentimentFeedProps) {
  return (
    <section className="flex h-full flex-col border border-ink/15 bg-paper/80">
      <div className="flex items-baseline gap-4 border-b border-ink/12 px-4 py-2.5">
        <h2 className="font-label text-[11px] font-700 uppercase tracking-[0.2em]">
          Kayıt defteri
        </h2>
        <p className="ml-auto font-data text-[10px] text-ink-soft">
          FinBERT okuması
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="px-4 py-12 text-center font-data text-xs text-ink-soft">
          Defter boş. İlk çevrim tamamlandığında okunan her başlık buraya
          skoruyla birlikte düşer.
        </p>
      ) : (
        <div className="flex-1">
          {logs.map((log, i) => {
            const positive = log.score >= 0.3;
            const negative = log.score <= -0.3;

            return (
              <article
                key={log.id}
                className="feed-in border-b border-ink/8 px-4 py-3 last:border-b-0 hover:bg-grid-fine/40"
                style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
              >
                <div className="flex items-baseline gap-2.5">
                  <time className="font-data text-[10px] tabular-nums text-ink-faint">
                    {new Date(log.timestamp).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <span className="font-label text-[9px] font-600 uppercase tracking-[0.14em] text-ink-soft">
                    {log.source}
                  </span>
                  <span
                    className={cn(
                      "ml-auto font-data text-[11px] tabular-nums",
                      positive
                        ? "text-trace-alt"
                        : negative
                          ? "text-trace"
                          : "text-ink-soft"
                    )}
                  >
                    {log.score > 0 ? "+" : ""}
                    {log.score.toFixed(2)}
                  </span>
                </div>

                <p className="font-prose mt-1 text-[15px] leading-snug text-ink">
                  {log.headline}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
