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

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dropdown açılınca alarmları yükle
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
      <header className="flex items-center justify-between border-b border-black/5 bg-surface-light px-6 py-4">
        {/* Mobil menü */}
        <button
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl hover:bg-black/5 transition-colors"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </button>

        {/* Arama — Header'daki global arama, CryptoTable içindekini kullan */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60 text-xs select-none">🔍</span>
            <input
              type="text"
              placeholder="Kripto ara... (aşağıdaki tabloda filtreler)"
              readOnly
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[placeholder="Search..."]');
                el?.focus();
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="w-full cursor-pointer rounded-xl border-none bg-bg-light py-2.5 pl-9 pr-4 text-sm text-text-secondary/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Sağ aksiyonlar */}
        <div className="flex items-center gap-2" ref={dropdownRef}>
          {/* Bildirimler butonu */}
          <div className="relative">
            <button
              onClick={handleBellClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-black/5 transition-colors"
              title="Alarmlar"
            >
              <Bell className="h-5 w-5 text-text-secondary" />
              {activeAlerts.length > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />
              )}
              {!isLoggedIn && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />
              )}
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-72 rounded-2xl bg-white border border-black/5 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                  <span className="text-sm font-bold text-text-primary">Alarmlar</span>
                  <button onClick={() => setDropdownOpen(false)}>
                    <X className="h-4 w-4 text-text-secondary" />
                  </button>
                </div>

                {!isLoggedIn ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-text-secondary mb-3">Alarmları görmek için giriş yapın.</p>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-dark transition-colors"
                    >
                      Settings&apos;e Git
                    </button>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-secondary">
                    Aktif alarm yok.
                  </div>
                ) : (
                  <div className="divide-y divide-black/5 max-h-64 overflow-y-auto">
                    {alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${alert.is_active ? "bg-primary" : "bg-black/20"}`} />
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
                  className="flex w-full items-center justify-between px-4 py-3 border-t border-black/5 text-xs font-semibold text-primary hover:bg-pastel-green transition-colors"
                >
                  Tüm Alarmları Yönet
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">EA</span>
          </div>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
