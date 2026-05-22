"use client";

import { ToastContainer } from "./Toast";
import { useAlertNotifications } from "@/hooks/useAlertNotifications";

export function AlertToastProvider() {
  const { toasts, dismiss } = useAlertNotifications();
  return <ToastContainer notifications={toasts} onDismiss={dismiss} />;
}
