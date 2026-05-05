"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Loader2, LogIn, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { fetchAlerts, deleteAlert, patchAlert, getToken, type ApiAlert } from "@/lib/api";

const conditionLabel = (type: string, threshold: number) => {
  switch (type) {
    case "sentiment_below": return `Sentiment < ${threshold}`;
    case "sentiment_above": return `Sentiment > ${threshold}`;
    case "price_below":     return `Price < $${threshold.toLocaleString()}`;
    case "price_above":     return `Price > $${threshold.toLocaleString()}`;
    default:                return `${type} ${threshold}`;
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    if (token) {
      fetchAlerts().then((data) => {
        setAlerts(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: number) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggle = async (alert: ApiAlert) => {
    const updated = await patchAlert(alert.id, { is_active: !alert.is_active });
    if (updated) {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your price and sentiment alerts</p>
        </div>
        <div className="rounded-2xl bg-surface-light border-2 border-dashed border-black/10 p-12 text-center">
          <LogIn className="h-12 w-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">Login required</p>
          <p className="text-sm text-text-secondary mt-1">
            Please log in from Settings to manage your alerts.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your price and sentiment alerts</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl bg-surface-light border-2 border-dashed border-black/10 p-12 text-center">
          <Bell className="h-12 w-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">No alerts yet</p>
          <p className="text-sm text-text-secondary mt-1">
            Create alerts to get notified when conditions are met.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-4 rounded-2xl bg-surface-light border border-black/5 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pastel-blue">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text-primary">
                  Asset #{alert.asset_id}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {conditionLabel(alert.condition_type, alert.threshold)}
                </p>
                {alert.last_triggered_at && (
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Last triggered:{" "}
                    {new Date(alert.last_triggered_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(alert)}
                  className="text-text-secondary hover:text-primary transition-colors"
                  title={alert.is_active ? "Pause alert" : "Activate alert"}
                >
                  {alert.is_active ? (
                    <ToggleRight className="h-6 w-6 text-primary" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                    alert.is_active
                      ? "bg-pastel-green text-primary"
                      : "bg-black/5 text-text-secondary"
                  }`}
                >
                  {alert.is_active ? "Active" : "Paused"}
                </span>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pastel-red transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
