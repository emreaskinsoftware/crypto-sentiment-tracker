import { cn } from "@/lib/utils";

interface SentimentBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function SentimentBadge({ score, size = "md" }: SentimentBadgeProps) {
  const isPositive = score >= 0.3;
  const isNegative = score <= -0.3;

  const label = isPositive ? "Positive" : isNegative ? "Negative" : "Neutral";
  const bg = isPositive
    ? "bg-pastel-green text-primary"
    : isNegative
      ? "bg-pastel-red text-danger"
      : "bg-pastel-yellow text-warning";

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn("rounded-full font-bold whitespace-nowrap", bg, sizes[size])}
    >
      {label} ({score > 0 ? "+" : ""}{score.toFixed(2)})
    </span>
  );
}
