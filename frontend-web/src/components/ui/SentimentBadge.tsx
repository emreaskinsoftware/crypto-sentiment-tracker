import { cn } from "@/lib/utils";

interface SentimentBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Rozet değil, ölçek. Duygu −1…+1 aralığında bir konumdur; etiket yerine
 * konumu göstermek hem daha doğru hem de cihazın diline uygun.
 */
export function SentimentBadge({ score, size = "md" }: SentimentBadgeProps) {
  const clamped = Math.max(-1, Math.min(1, score));
  const isPositive = clamped >= 0.3;
  const isNegative = clamped <= -0.3;

  const ink = isPositive
    ? "text-trace-alt"
    : isNegative
      ? "text-trace"
      : "text-ink-soft";

  const fill = isPositive
    ? "bg-trace-alt"
    : isNegative
      ? "bg-trace"
      : "bg-ink-faint";

  const track = {
    sm: "w-10 h-[14px]",
    md: "w-14 h-4",
    lg: "w-20 h-5",
  }[size];

  const type = {
    sm: "text-[10px]",
    md: "text-[11px]",
    lg: "text-sm",
  }[size];

  // Sıfır ortada; çubuk sıfırdan skora doğru uzar
  const half = Math.abs(clamped) * 50;
  const left = clamped >= 0 ? 50 : 50 - half;

  return (
    <span
      className="inline-flex items-center gap-2"
      title={`Duygu ${clamped > 0 ? "+" : ""}${clamped.toFixed(2)} (−1…+1)`}
    >
      <span className={cn("relative border border-ink/20 bg-paper", track)}>
        {/* Nötr ekseni */}
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/25" />
        <span
          className={cn("absolute top-1/2 h-[3px] -translate-y-1/2", fill)}
          style={{ left: `${left}%`, width: `${half}%` }}
        />
      </span>
      <span className={cn("font-data tabular-nums", type, ink)}>
        {clamped > 0 ? "+" : ""}
        {clamped.toFixed(2)}
      </span>
    </span>
  );
}
