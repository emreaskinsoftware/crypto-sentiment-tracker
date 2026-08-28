"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";
import { fetchAlerts, getToken, type ApiAlert } from "@/lib/api";

function Clock() {
  // Sunucu saati istemciyle uyuşmayabilir; bağlanana kadar yer tutar.
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-data text-[11px] tabular-nums text-ink-soft">
      {now ?? <span className="opacity-0">00:00:00</span>}
    </span>
  );
}

export function Header() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleBell = async () => {
    if (!open && getToken()) setAlerts(await fetchAlerts());
    setOpen((v) => !v);
  };

  const isLoggedIn = !!getToken();
  const active = alerts.filter((a) => a.is_active).length;

  return (
    <>
      <header className="flex items-center gap-4 border-b border-ink/15 bg-paper-deep px-4 py-2">
        <button
          className="md:hidden border border-ink/25 px-2 py-1 font-label text-[10px] font-600 uppercase tracking-[0.14em] hover:bg-ink hover:text-paper transition-colors"
          onClick={() => setMobileNavOpen(true)}
        >
          Menü
        </button>

        <Clock />

        <div className="ml-auto flex items-center gap-3" ref={ref}>
          <div className="relative">
            <button
              onClick={handleBell}
              className="flex items-center gap-2 border border-ink/25 px-2.5 py-1 font-label text-[10px] font-600 uppercase tracking-[0.14em] hover:bg-ink hover:text-paper transition-colors"
            >
              Alarm
              {active > 0 && (
                <span className="font-data text-[10px] tabular-nums text-trace">
                  {active}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-9 z-50 w-72 border border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
                <div className="border-b border-ink/15 px-3.5 py-2">
                  <p className="font-label text-[10px] font-700 uppercase tracking-[0.2em]">
                    Alarmlar
                  </p>
                </div>

                {!isLoggedIn ? (
                  <div className="px-3.5 py-5">
                    <p className="font-data text-[11px] leading-relaxed text-ink-soft">
                      Alarmları görmek için giriş yapın.
                    </p>
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push("/settings");
                      }}
                      className="mt-3 border border-ink bg-ink px-3 py-1.5 font-label text-[10px] font-600 uppercase tracking-[0.14em] text-paper hover:bg-trace hover:border-trace transition-colors"
                    >
                      Giriş yap
                    </button>
                  </div>
                ) : alerts.length === 0 ? (
                  <p className="px-3.5 py-5 font-data text-[11px] leading-relaxed text-ink-soft">
                    Kurulu alarm yok. Alarm sayfasından bir eşik tanımlayın.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto scrollbar-hide">
                    {alerts.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-baseline gap-2.5 border-b border-ink/8 px-3.5 py-2.5 last:border-b-0"
                      >
                        <span
                          className={cn(
                            "mt-1 h-1.5 w-1.5 shrink-0",
                            a.is_active ? "bg-trace" : "bg-ink-faint"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-data text-[11px] text-ink truncate">
                            #{a.asset_id} {a.condition_type.replace("_", " ")}{" "}
                            {a.threshold}
                          </p>
                          <p className="font-data text-[10px] text-ink-faint">
                            {a.is_active ? "açık" : "kapalı"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/alerts");
                  }}
                  className="w-full border-t border-ink/15 px-3.5 py-2 text-left font-label text-[10px] font-600 uppercase tracking-[0.14em] text-ink hover:bg-ink hover:text-paper transition-colors"
                >
                  Tüm alarmları yönet →
                </button>
              </div>
            )}
          </div>

          <span className="border border-ink/25 px-2 py-1 font-data text-[11px] text-ink-soft">
            EA
          </span>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
