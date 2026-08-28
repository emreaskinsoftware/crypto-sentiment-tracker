"use client";

import { RefreshCw, Clock, CheckCircle, AlertCircle, Loader2, LogIn } from "lucide-react";
import { usePipelineRefresh } from "@/hooks/usePipelineRefresh";

function fmtSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
}

export function RefreshButton() {
  const { state, trigger } = usePipelineRefresh();

  const isDisabled =
    state.kind === "running" ||
    state.kind === "cooldown" ||
    state.kind === "done" ||
    state.kind === "unauthenticated";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={trigger}
        disabled={isDisabled}
        className={[
          "flex items-center gap-2  px-4 py-2 text-sm font-semibold transition-all",
          state.kind === "idle"
            ? "bg-paper-deep border border-trace-alt/20 text-trace-alt hover:bg-trace-alt/10 cursor-pointer"
            : state.kind === "running"
            ? "bg-blue-50 border border-blue-200 text-blue-600 cursor-not-allowed"
            : state.kind === "cooldown"
            ? "bg-yellow-50 border border-yellow-200 text-yellow-700 cursor-not-allowed"
            : state.kind === "done"
            ? "bg-green-50 border border-green-200 text-green-700 cursor-not-allowed"
            : "bg-red-50 border border-red-200 text-red-600 cursor-not-allowed",
        ].join(" ")}
      >
        {state.kind === "idle" && (
          <>
            <RefreshCw size={15} />
            Yenile
          </>
        )}
        {state.kind === "running" && (
          <>
            <Loader2 size={15} className="animate-spin" />
            Analiz yapılıyor…
          </>
        )}
        {state.kind === "cooldown" && (
          <>
            <Clock size={15} />
            {fmtSeconds(state.remainingSeconds)}
          </>
        )}
        {state.kind === "done" && (
          <>
            <CheckCircle size={15} />
            Güncellendi
          </>
        )}
        {state.kind === "error" && (
          <>
            <AlertCircle size={15} />
            Hata
          </>
        )}
        {state.kind === "unauthenticated" && (
          <>
            <LogIn size={15} />
            Giriş Gerekli
          </>
        )}
      </button>

      {/* Bilgi banner'ı */}
      {state.kind === "running" && (
        <p className="text-xs text-ink-soft max-w-[220px] text-right leading-snug">
          Haber verisi çekiliyor ve FinBERT ile analiz ediliyor.
          Bu işlem ~30–60 sn sürebilir.
        </p>
      )}
      {state.kind === "cooldown" && (
        <p className="text-xs text-yellow-600 max-w-[220px] text-right leading-snug">
          Aşırı yükü önlemek için 15 dk'da bir yenileyebilirsiniz.
        </p>
      )}
      {state.kind === "error" && (
        <p className="text-xs text-red-500 max-w-[220px] text-right leading-snug">
          {state.message}
        </p>
      )}
      {state.kind === "unauthenticated" && (
        <p className="text-xs text-ink-soft max-w-[220px] text-right leading-snug">
          Pipeline tetiklemek için Ayarlar&apos;dan giriş yapın.
        </p>
      )}
    </div>
  );
}
