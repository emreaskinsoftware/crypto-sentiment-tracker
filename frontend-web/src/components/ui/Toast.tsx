"use client";

import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
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
        "flex items-start gap-3 w-80 rounded-2xl border border-white/10 bg-surface-card shadow-2xl px-4 py-3.5 transition-all duration-300",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/10 border border-warning/20">
        <Bell className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">
          {n.asset_symbol} Alarm Tetiklendi
        </p>
        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
          {conditionLabel(n.condition_type, n.threshold, n.actual_value)}
        </p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
        className="mt-0.5 shrink-0 text-text-secondary/50 hover:text-text-secondary transition-colors"
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onClose={() => onDismiss(n.id)} />
      ))}
    </div>
  );
}
