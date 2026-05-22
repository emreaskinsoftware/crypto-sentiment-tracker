"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Star, Bell, Settings, X, Zap } from "lucide-react";

const navItems = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/alerts",    label: "Alarmlar",  icon: Bell },
  { href: "/settings",  label: "Ayarlar",   icon: Settings },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-surface-light border-r border-white/5 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-dark text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-base font-extrabold text-text-primary">SentimentRadar</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
