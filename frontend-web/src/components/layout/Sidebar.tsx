"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Star,
  TrendingUp,
  Bell,
  Settings,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-surface-light border-r border-black/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">
            SentimentRadar
          </h1>
          <p className="text-xs text-text-secondary">Crypto Analytics</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-pastel-green text-primary font-bold"
                  : "text-text-secondary hover:bg-black/5 hover:text-text-primary"
              )}
            >
              <Icon
                className={cn("h-5 w-5", isActive ? "text-primary" : "")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Market Summary */}
      <div className="mx-4 mb-4 rounded-2xl bg-pastel-green p-4 border border-primary/10">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Market Sentiment
          </span>
        </div>
        <p className="text-2xl font-extrabold text-text-primary">+0.62</p>
        <p className="text-xs text-text-secondary mt-1">
          Overall market is bullish
        </p>
      </div>
    </aside>
  );
}
