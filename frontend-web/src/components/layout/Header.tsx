"use client";

import { Bell, Menu, X, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "./MobileNav";
import { fetchAlerts, getToken, type ApiAlert } from "@/lib/api";

export function Header() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    if (!dropdownOpen && getToken()) {
      const data = await fetchAlerts();
      setAlerts(data);
    }
    setDropdownOpen((v) => !v);
  };

  const activeAlerts = alerts.filter((a) => a.is_active);
  const isLoggedIn = !!getToken();

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/5 bg-surface-light px-6 py-3.5">
        {/* Mobile menu toggle */}
        <button
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-4 w-4 text-text-primary" />
        </button>

        {/* Search bar */}
        <div className="flex-1 max-w-sm mx-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40 text-xs select-none">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Kripto ara…"
              readOnly
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[placeholder="Search..."]');
                el?.focus();
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="w-full cursor-pointer rounded-xl border border-white/5 bg-white/3 py-2 pl-8 pr-4 text-sm text-text-secondary/50 placeholder:text-text-secondary/40 focus:outline-none hover:border-white/10 transition-colors"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2" ref={dropdownRef}>
          {/* Bell */}
          <div className="relative">
            <button
              onClick={handleBellClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 transition-colors"
              title="Alarmlar"
            >
              <Bell className="h-4 w-4 text-text-secondary" />
              {(activeAlerts.length > 0 || !isLoggedIn) && (
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-danger" />
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-11 w-72 rounded-2xl bg-surface-card border border-white/8 shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <span className="text-sm font-bold text-text-primary">Alarmlar</span>
                  <button onClick={() => setDropdownOpen(false)}>
                    <X className="h-4 w-4 text-text-secondary hover:text-text-primary transition-colors" />
                  </button>
                </div>

                {!isLoggedIn ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-text-secondary mb-3">
                      Alarmları görmek için giriş yapın.
                    </p>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                      className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      Giriş Yap
                    </button>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-secondary">
                    Aktif alarm yok.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-60 overflow-y-auto scrollbar-hide">
                    {alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${alert.is_active ? "bg-primary" : "bg-white/20"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">
                            Asset #{alert.asset_id} — {alert.condition_type.replace("_", " ")} {alert.threshold}
                          </p>
                          <p className="text-[10px] text-text-secondary">
                            {alert.is_active ? "Aktif" : "Pasif"}
                            {alert.last_triggered_at && ` · Son: ${new Date(alert.last_triggered_at).toLocaleDateString("tr-TR")}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setDropdownOpen(false); router.push("/alerts"); }}
                  className="flex w-full items-center justify-between px-4 py-3 border-t border-white/5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  Tüm Alarmları Yönet
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
            <span className="text-xs font-extrabold text-primary">EA</span>
          </div>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
