"use client";

import { usePipelineRefresh } from "@/hooks/usePipelineRefresh";
import { PipelineProgressPanel } from "./PipelineProgressPanel";
import { cn } from "@/lib/utils";

function fmtSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}dk ${String(s).padStart(2, "0")}sn` : `${s}sn`;
}

export function DashboardHeader() {
  const { state, trigger } = usePipelineRefresh();

  const busy = state.kind !== "idle";

  // Eylem adı akış boyunca aynı kalır: "örnek al" → "alınıyor" → "alındı"
  const label =
    state.kind === "idle"
      ? "Yeni örnek al"
      : state.kind === "running"
        ? "Örnek alınıyor"
        : state.kind === "cooldown"
          ? `Sonraki örnek ${fmtSeconds(state.remainingSeconds)}`
          : state.kind === "done"
            ? "Örnek alındı"
            : state.kind === "unauthenticated"
              ? "Giriş gerekli"
              : "Alınamadı";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">
            Kayıt şeridi
          </h1>
          <p className="font-data mt-2 text-[12px] leading-relaxed text-ink-soft">
            Haber duygusu ve fiyat, aynı zaman ekseninde. Cihaz 15 dakikada bir
            örnek alır; aradaki fiyatlar canlı okunur.
          </p>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <button
            onClick={trigger}
            disabled={busy}
            className={cn(
              "border px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] transition-all duration-150",
              state.kind === "idle"
                ? "border-ink bg-ink text-paper shadow-[3px_3px_0_var(--color-trace)] hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] cursor-pointer"
                : state.kind === "error" || state.kind === "unauthenticated"
                  ? "border-trace bg-paper text-trace cursor-not-allowed"
                  : "border-ink/30 bg-paper text-ink-soft cursor-not-allowed"
            )}
          >
            {label}
          </button>

          {state.kind === "unauthenticated" && (
            <p className="font-data text-[10px] text-ink-soft">
              Ayarlar sayfasından giriş yapın.
            </p>
          )}
          {state.kind === "cooldown" && (
            <p className="font-data text-[10px] text-ink-soft">
              Cihaz 15 dakikada bir örnek alır.
            </p>
          )}
          {state.kind === "error" && "message" in state && (
            <p className="font-data text-[10px] text-trace">{state.message}</p>
          )}
        </div>
      </div>

      <PipelineProgressPanel state={state} />
    </>
  );
}
