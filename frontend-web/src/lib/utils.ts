import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${value.toFixed(4)}`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString("en-US")}`;
}

export function getSentimentColor(score: number): string {
  if (score >= 0.3) return "text-primary";
  if (score <= -0.3) return "text-danger";
  return "text-warning";
}

export function getSentimentBg(score: number): string {
  if (score >= 0.3) return "bg-pastel-green";
  if (score <= -0.3) return "bg-pastel-red";
  return "bg-pastel-yellow";
}

export function getSentimentLabel(score: number): string {
  if (score >= 0.3) return "Positive";
  if (score <= -0.3) return "Negative";
  return "Neutral";
}
