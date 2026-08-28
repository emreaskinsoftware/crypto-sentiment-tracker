"use client";

import { useEffect, useState } from "react";

// Celery beat duygu çevrimi: her saatin :02 :17 :32 :47'sinde
const RECORD_MINUTES = [2, 17, 32, 47];

function secondsUntilNextRecord(now: Date): number {
  const m = now.getMinutes();
  const s = now.getSeconds();
  for (const target of RECORD_MINUTES) {
    if (m < target) return (target - m) * 60 - s;
  }
  // Bu saat içinde kalmadı — sonraki saatin ilkine
  return (60 - m + RECORD_MINUTES[0]) * 60 - s;
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RecordingLamp() {
  // Sunucu ile istemci saati farklı olabilir; bağlanana kadar boş kalır.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(secondsUntilNextRecord(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className="lamp inline-block h-1.5 w-1.5 shrink-0 bg-trace"
          aria-hidden="true"
        />
        <span className="font-label text-[10px] font-600 uppercase tracking-[0.18em] text-paper/70">
          Kayıtta
        </span>
      </div>
      <p className="font-data text-[11px] text-paper/45 mt-2 tabular-nums">
        {remaining === null ? (
          <span className="opacity-0">--:--</span>
        ) : (
          <>sonraki örnek {fmt(remaining)}</>
        )}
      </p>
    </div>
  );
}
