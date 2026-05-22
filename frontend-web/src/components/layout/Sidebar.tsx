"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Star,
  Bell,
  Settings,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const navItems = [
  { href: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist",  icon: Star },
  { href: "/alerts",    label: "Alarmlar",   icon: Bell },
  { href: "/settings",  label: "Ayarlar",    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-surface-light border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary to-primary-dark" />
          <Zap className="relative h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-extrabold text-text-primary tracking-tight">
            SentimentRadar
          </h1>
          <p className="text-[11px] text-primary/60 font-medium">Crypto Analytics</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary/50 mb-3">
          Menü
        </p>
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
                "group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "group-hover:text-text-primary"
                )}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Market sentiment widget */}
      <div className="mx-4 mb-5 rounded-2xl border border-white/5 bg-white/3 p-4 overflow-hidden relative">
        <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/10 blur-xl" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 mb-2">
            Market Pulse
          </p>
          <p className="text-3xl font-extrabold text-text-primary mb-1">+0.62</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-bold">Bullish</span>
            </div>
            <span className="text-text-secondary/40 text-xs">•</span>
            <span className="text-xs text-text-secondary">Genel piyasa</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/5">
            <div className="h-full w-[72%] rounded-full bg-linear-to-r from-primary/60 to-primary" />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-danger/70 flex items-center gap-0.5">
              <TrendingDown className="h-2.5 w-2.5" /> Bearish
            </span>
            <span className="text-[10px] text-primary/70">72% Bullish</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
