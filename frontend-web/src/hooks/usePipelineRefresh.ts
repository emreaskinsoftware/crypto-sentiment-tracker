"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type PipelineStage =
  | "prices"   // 0–12s
  | "news"     // 12–30s
  | "finbert"  // 30–55s
  | "saving";  // 55s+

export type RefreshState =
  | { kind: "idle" }
  | { kind: "running"; stage: PipelineStage; elapsedSeconds: number }
  | { kind: "cooldown"; remainingSeconds: number }
  | { kind: "done" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated" };

function elapsedToStage(elapsed: number): PipelineStage {
  if (elapsed < 12) return "prices";
  if (elapsed < 30) return "news";
  if (elapsed < 55) return "finbert";
  return "saving";
}

export function usePipelineRefresh() {
  const router = useRouter();
  const [state, setState] = useState<RefreshState>({ kind: "idle" });
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecs = useRef(0);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const stopElapsed = useCallback(() => {
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    elapsedSecs.current = 0;
  }, []);

  const startCooldownTimer = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    let remaining = seconds;
    setState({ kind: "cooldown", remainingSeconds: remaining });

    cooldownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        setState({ kind: "idle" });
      } else {
        setState({ kind: "cooldown", remainingSeconds: remaining });
      }
    }, 1000);
  }, []);

  const startElapsedTimer = useCallback(() => {
    stopElapsed();
    elapsedSecs.current = 0;
    elapsedRef.current = setInterval(() => {
      elapsedSecs.current += 1;
      setState({
        kind: "running",
        stage: elapsedToStage(elapsedSecs.current),
        elapsedSeconds: elapsedSecs.current,
      });
    }, 1000);
  }, [stopElapsed]);

  const startPolling = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/pipeline/status`);
        if (!res.ok) return;
        const data: { running: boolean; cooldown_remaining_seconds: number } =
          await res.json();

        if (!data.running) {
          stopPoll();
          stopElapsed();
          router.refresh();
          setState({ kind: "done" });
          setTimeout(() => setState({ kind: "idle" }), 3000);
        }
      } catch {
        // network glitch — keep polling
      }
    }, 5000);
  }, [router, stopPoll, stopElapsed]);

  const trigger = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ kind: "unauthenticated" });
      setTimeout(() => setState({ kind: "idle" }), 4000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/pipeline/trigger`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        setState({ kind: "unauthenticated" });
        setTimeout(() => setState({ kind: "idle" }), 4000);
        return;
      }

      const data: {
        status: "started" | "cooldown" | "already_running";
        cooldown_remaining_seconds: number;
        message: string;
      } = await res.json();

      if (data.status === "started" || data.status === "already_running") {
        setState({ kind: "running", stage: "prices", elapsedSeconds: 0 });
        startElapsedTimer();
        startPolling();
      } else if (data.status === "cooldown") {
        startCooldownTimer(data.cooldown_remaining_seconds);
      }
    } catch {
      setState({ kind: "error", message: "Sunucuya bağlanılamadı." });
      setTimeout(() => setState({ kind: "idle" }), 4000);
    }
  }, [startPolling, startElapsedTimer, startCooldownTimer]);

  useEffect(() => {
    return () => {
      stopPoll();
      stopElapsed();
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [stopPoll, stopElapsed]);

  return { state, trigger };
}
