"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiNotification } from "@/lib/api";

function conditionLabel(type: string, threshold: number, actual: number): string {
  switch (type) {
    case "price_above":  return `Fiyat $${actual.toLocaleString("en-US", { maximumFractionDigits: 4 })} ile $${threshold.toLocaleString()} eşiğini aştı`;
    case "price_below":  return `Fiyat $${actual.toLocaleString("en-US", { maximumFractionDigits: 4 })} ile $${threshold.toLocaleString()} eşiğinin altına düştü`;
    case "sentiment_above": return `Sentiment ${actual > 0 ? "+" : ""}${actual.toFixed(3)} ile ${threshold > 0 ? "+" : ""}${threshold} eşiğini aştı`;
    case "sentiment_below": return `Sentiment ${actual > 0 ? "+" : ""}${actual.toFixed(3)} ile ${threshold > 0 ? "+" : ""}${threshold} eşiğinin altına düştü`;
    default: return type;
  }
}

interface ToastItemProps {
  notification: ApiNotification;
  onClose: () => void;
}

function ToastItem({ notification: n, onClose }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // mount sonrası animate-in
    const t1 = setTimeout(() => setVisible(true), 10);
    // 6 saniye sonra kapat
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 350);
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div
      className={cn(
        "flex w-80 items-start gap-3 border border-ink bg-paper px-4 py-3 shadow-[3px_3px_0_var(--color-ink)] transition-all duration-300",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
      )}
    >
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-trace" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-label text-[11px] font-600 uppercase tracking-[0.16em] text-ink">
          {n.asset_symbol} eşiği aşıldı
        </p>
        <p className="font-data mt-1 text-[11px] leading-relaxed text-ink-soft">
          {conditionLabel(n.condition_type, n.threshold, n.actual_value)}
        </p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
        className="mt-0.5 shrink-0 text-ink-faint transition-colors hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  notifications: ApiNotification[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ notifications, onDismiss }: ToastContainerProps) {
  if (notifications.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onClose={() => onDismiss(n.id)} />
      ))}
    </div>
  );
}
