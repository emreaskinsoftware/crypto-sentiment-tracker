import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  bgColor,
  iconColor,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-5 border transition-transform hover:scale-[1.02]",
        bgColor
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
        {title}
      </p>
      <p className="text-2xl font-extrabold text-text-primary">{value}</p>
      {subtitle && (
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}
