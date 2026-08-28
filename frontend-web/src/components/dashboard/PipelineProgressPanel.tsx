"use client";

import { cn } from "@/lib/utils";
import type { RefreshState, PipelineStage } from "@/hooks/usePipelineRefresh";

const STAGES: {
  id: PipelineStage;
  label: string;
  detail: string;
  duration: number;
}[] = [
  { id: "prices", label: "Fiyat", detail: "Binance'den fiyatlar okunuyor", duration: 12 },
  { id: "news", label: "Haber", detail: "RSS ve Reddit taranıyor", duration: 18 },
  { id: "finbert", label: "FinBERT", detail: "Başlıklar puanlanıyor", duration: 25 },
  { id: "saving", label: "Kayıt", detail: "Örnekler deftere yazılıyor", duration: 10 },
];

const TOTAL = STAGES.reduce((s, st) => s + st.duration, 0);

function stageIndex(stage: PipelineStage): number {
  const i = STAGES.findIndex((s) => s.id === stage);
  return i === -1 ? STAGES.length - 1 : i;
}

function progressOf(stage: PipelineStage, elapsed: number): number {
  const idx = stageIndex(stage);
  const done = STAGES.slice(0, idx).reduce((s, st) => s + st.duration, 0);
  const within = Math.min(Math.max(elapsed - done, 0), STAGES[idx].duration);
  return Math.min(Math.round(((done + within) / TOTAL) * 100), 99);
}

export function PipelineProgressPanel({ state }: { state: RefreshState }) {
  if (state.kind !== "running" && state.kind !== "done") return null;

  const done = state.kind === "done";
  const activeIdx = done ? STAGES.length : stageIndex(state.stage);
  const percent = done ? 100 : progressOf(state.stage, state.elapsedSeconds);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pipeline-panel fixed bottom-5 right-5 z-50 w-[19rem] border border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]"
    >
      <div className="flex items-baseline gap-2 border-b border-ink/15 px-3.5 py-2">
        {!done && (
          <span className="lamp inline-block h-1.5 w-1.5 shrink-0 bg-trace" aria-hidden="true" />
        )}
        <p className="font-label text-[10px] font-700 uppercase tracking-[0.2em]">
          {done ? "Çevrim tamam" : "Çevrim sürüyor"}
        </p>
        <p className="ml-auto font-data text-[11px] tabular-nums text-ink-soft">
          {done ? "100%" : `${state.elapsedSeconds}sn · ${percent}%`}
        </p>
      </div>

      <div className="px-3.5 py-3">
        {/* Şerit — dolan kısım mürekkep */}
        <div className="relative h-2 border border-ink/25 bg-paper">
          <div
            className="h-full bg-ink transition-[width] duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
          {/* Aşama bölmeleri */}
          {STAGES.slice(0, -1).map((s, i) => {
            const left =
              (STAGES.slice(0, i + 1).reduce((a, st) => a + st.duration, 0) / TOTAL) * 100;
            return (
              <span
                key={s.id}
                className="absolute top-0 h-full w-px bg-ink/25"
                style={{ left: `${left}%` }}
              />
            );
          })}
        </div>

        <div className="mt-2 flex justify-between">
          {STAGES.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "font-label text-[9px] font-600 uppercase tracking-[0.12em]",
                i < activeIdx
                  ? "text-ink"
                  : i === activeIdx
                    ? "text-trace"
                    : "text-ink-faint"
              )}
            >
              {s.label}
            </span>
          ))}
        </div>

        <p className="mt-2.5 font-data text-[10px] leading-snug text-ink-soft">
          {done
            ? "Defter güncellendi. Şerit yeni örneklerle yeniden çizildi."
            : STAGES[activeIdx].detail + "…"}
        </p>
      </div>
    </div>
  );
}
