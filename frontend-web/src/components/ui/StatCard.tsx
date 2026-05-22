import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Variant = "green" | "blue" | "yellow" | "purple";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: Variant;
  /** Legacy support — ignored if variant is provided */
  bgColor?: string;
  iconColor?: string;
}

const variantMap: Record<Variant, { card: string; icon: string; glow: string }> = {
  green:  { card: "border-primary/15",       icon: "bg-primary/15 text-primary",     glow: "shadow-[0_0_24px_rgba(16,185,129,0.08)]"  },
  blue:   { card: "border-blue-500/15",       icon: "bg-blue-500/15 text-blue-400",   glow: "shadow-[0_0_24px_rgba(59,130,246,0.08)]"  },
  yellow: { card: "border-warning/15",        icon: "bg-warning/15 text-warning",     glow: "shadow-[0_0_24px_rgba(245,158,11,0.08)]"  },
  purple: { card: "border-purple-500/15",     icon: "bg-purple-500/15 text-purple-400", glow: "shadow-[0_0_24px_rgba(168,85,247,0.08)]" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "green",
}: StatCardProps) {
  const v = variantMap[variant];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-5 border bg-surface-card transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5",
        v.card,
        v.glow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", v.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary mb-1">
        {title}
      </p>
      <p className="text-2xl font-extrabold text-text-primary">{value}</p>
      {subtitle && (
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}
