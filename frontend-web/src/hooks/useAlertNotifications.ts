"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNotifications, markNotificationsRead, getToken, type ApiNotification } from "@/lib/api";

const POLL_INTERVAL = 30_000;

export function useAlertNotifications() {
  const [toasts, setToasts] = useState<ApiNotification[]>([]);
  const seenIds = useRef<Set<number>>(new Set());

  const poll = useCallback(async () => {
    if (!getToken()) return;
    try {
      const fresh = await fetchNotifications();
      const newOnes = fresh.filter((n) => !seenIds.current.has(n.id));
      if (newOnes.length === 0) return;

      newOnes.forEach((n) => seenIds.current.add(n.id));
      setToasts((prev) => [...prev, ...newOnes]);

      // Okundu işaretle
      markNotificationsRead(newOnes.map((n) => n.id));
    } catch { /* sessiz */ }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { toasts, dismiss };
}
