import { cn } from "@/lib/utils";

interface SentimentBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function SentimentBadge({ score, size = "md" }: SentimentBadgeProps) {
  const isPositive = score >= 0.3;
  const isNegative = score <= -0.3;

  const label = isPositive ? "Positive" : isNegative ? "Negative" : "Neutral";

  const style = isPositive
    ? "bg-primary/10 text-primary border border-primary/20"
    : isNegative
    ? "bg-danger/10 text-danger border border-danger/20"
    : "bg-warning/10 text-warning border border-warning/20";

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span className={cn("rounded-full font-bold whitespace-nowrap", style, sizes[size])}>
      {label} ({score > 0 ? "+" : ""}{score.toFixed(2)})
    </span>
  );
}
