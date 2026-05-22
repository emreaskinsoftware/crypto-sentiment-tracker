"use client";

import {
  RefreshCw, Clock, CheckCircle, AlertCircle, Loader2, LogIn,
} from "lucide-react";
import { usePipelineRefresh } from "@/hooks/usePipelineRefresh";
import { PipelineProgressPanel } from "./PipelineProgressPanel";
import { cn } from "@/lib/utils";

function fmtSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
}

export function DashboardHeader() {
  const { state, trigger } = usePipelineRefresh();

  const isDisabled =
    state.kind === "running" ||
    state.kind === "cooldown" ||
    state.kind === "done" ||
    state.kind === "unauthenticated";

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Title block */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              Live Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Market Overview
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Gerçek zamanlı kripto fiyatları ve FinBERT sentiment analizi
          </p>
        </div>

        {/* Refresh button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={trigger}
            disabled={isDisabled}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200",
              state.kind === "idle"
                ? "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)] cursor-pointer"
                : state.kind === "running"
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 cursor-not-allowed"
                : state.kind === "cooldown"
                ? "bg-warning/10 border border-warning/30 text-warning cursor-not-allowed"
                : state.kind === "done"
                ? "bg-primary/10 border border-primary/30 text-primary cursor-not-allowed"
                : state.kind === "unauthenticated"
                ? "bg-white/5 border border-white/10 text-text-secondary cursor-not-allowed"
                : "bg-danger/10 border border-danger/30 text-danger cursor-not-allowed"
            )}
          >
            {state.kind === "idle" && <><RefreshCw size={14} /> Veriyi Yenile</>}
            {state.kind === "running" && <><Loader2 size={14} className="animate-spin" /> Analiz yapılıyor…</>}
            {state.kind === "cooldown" && <><Clock size={14} /> {fmtSeconds(state.remainingSeconds)}</>}
            {state.kind === "done" && <><CheckCircle size={14} /> Güncellendi</>}
            {state.kind === "error" && <><AlertCircle size={14} /> Hata</>}
            {state.kind === "unauthenticated" && <><LogIn size={14} /> Giriş Gerekli</>}
          </button>

          {state.kind === "unauthenticated" && (
            <p className="text-[11px] text-text-secondary text-right">
              Ayarlar&apos;dan giriş yapın
            </p>
          )}
          {state.kind === "cooldown" && (
            <p className="text-[11px] text-warning/70 text-right">
              15 dk&apos;da bir yenileyebilirsiniz
            </p>
          )}
          {state.kind === "error" && "message" in state && (
            <p className="text-[11px] text-danger/70 text-right">
              {state.message}
            </p>
          )}
        </div>
      </div>

      {/* Floating pipeline progress panel */}
      <PipelineProgressPanel state={state} />
    </>
  );
}
