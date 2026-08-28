"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Plus, Trash2, Loader2, LogIn, ToggleLeft, ToggleRight, X } from "lucide-react";
import Link from "next/link";
import { fetchAlerts, deleteAlert, patchAlert, createAlert, fetchAssets, getToken, type ApiAlert, type ApiAsset } from "@/lib/api";

const conditionLabel = (type: string, threshold: number) => {
  switch (type) {
    case "sentiment_below": return `Sentiment < ${threshold}`;
    case "sentiment_above": return `Sentiment > ${threshold}`;
    case "price_below":     return `Price < $${threshold.toLocaleString()}`;
    case "price_above":     return `Price > $${threshold.toLocaleString()}`;
    default:                return `${type} ${threshold}`;
  }
};

function NewAlertModal({ assets, onClose, onCreated }: {
  assets: ApiAsset[];
  onClose: () => void;
  onCreated: (alert: ApiAlert) => void;
}) {
  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? "BTC");
  const [condition, setCondition] = useState("sentiment_below");
  const [threshold, setThreshold] = useState("-0.5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(threshold);
    if (isNaN(t)) { setError("Geçerli bir eşik değeri girin."); return; }
    setLoading(true);
    setError("");
    const result = await createAlert({ asset_symbol: symbol, condition, threshold: t });
    setLoading(false);
    if (result) { onCreated(result); onClose(); }
    else setError("Alarm oluşturulamadı. Tekrar deneyin.");
  };

  const isSentiment = condition.startsWith("sentiment");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Yeni Alarm Oluştur</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/5">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Varlık seçimi */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">Kripto Varlık</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-xl bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 border-none">
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</option>
              ))}
            </select>
          </div>

          {/* Koşul */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">Alarm Koşulu</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-xl bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 border-none">
              <option value="sentiment_below">Sentiment skoru altına düşerse</option>
              <option value="sentiment_above">Sentiment skoru üzerine çıkarsa</option>
              <option value="price_below">Fiyat altına düşerse</option>
              <option value="price_above">Fiyat üzerine çıkarsa</option>
            </select>
          </div>

          {/* Eşik */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Eşik Değeri {isSentiment ? "(-1.0 ile +1.0 arası)" : "($ olarak)"}
            </label>
            <input
              type="number"
              step={isSentiment ? "0.01" : "1"}
              min={isSentiment ? "-1" : "0"}
              max={isSentiment ? "1" : undefined}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={isSentiment ? "örn: -0.5" : "örn: 80000"}
              className="w-full rounded-xl bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 border-none"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Alarm Oluştur
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Her yerel değişiklik (sil/oluştur/aç-kapa) bu sayacı artırır. Poll yanıtı
  // ancak başladığından beri sayaç değişmediyse uygulanır; böylece uçuştaki
  // eski bir istek silinen alarmı geri getiremez ve yavaş bir tur, sonrasında
  // tamamlanan yeni bir turun sonucunu ezemez.
  const revision = useRef(0);

  useEffect(() => {
    const load = async () => {
      const startedAt = revision.current;
      const token = getToken();
      setIsLoggedIn(!!token);
      try {
        const [alertData, assetData] = await Promise.all([
          token ? fetchAlerts() : Promise.resolve([]),
          fetchAssets(),
        ]);
        if (revision.current !== startedAt) return;
        setAlerts(alertData);
        setAssets(assetData);
      } catch {
        // Tek bir başarısız tur sayfayı bozmasın; sonraki tur tekrar dener.
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: number) => {
    await deleteAlert(id);
    revision.current += 1;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggle = async (alert: ApiAlert) => {
    const updated = await patchAlert(alert.id, { is_active: !alert.is_active });
    if (updated) {
      revision.current += 1;
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    }
  };

  const handleCreated = (alert: ApiAlert) => {
    revision.current += 1;
    setAlerts((prev) => [alert, ...prev]);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
          <p className="text-sm text-text-secondary mt-1">Please log in from Settings to manage your alerts.</p>
          <Link href="/settings" className="inline-flex items-center gap-2 mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
            <LogIn className="h-4 w-4" /> Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && <NewAlertModal assets={assets} onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
            <p className="text-sm text-text-secondary mt-1">Manage your price and sentiment alerts</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
            <Plus className="h-4 w-4" /> New Alert
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-2xl bg-surface-light border-2 border-dashed border-black/10 p-12 text-center">
            <Bell className="h-12 w-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-lg font-bold text-text-primary">No alerts yet</p>
            <p className="text-sm text-text-secondary mt-1">Click "New Alert" to get notified when conditions are met.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const assetName = assets.find((a) => a.id === alert.asset_id)?.name ?? `Asset #${alert.asset_id}`;
              const assetSymbol = assets.find((a) => a.id === alert.asset_id)?.symbol ?? "";
              return (
                <div key={alert.id} className="flex items-center gap-4 rounded-2xl bg-surface-light border border-black/5 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pastel-blue">
                    <Bell className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary">{assetName} {assetSymbol && `(${assetSymbol})`}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{conditionLabel(alert.condition_type, alert.threshold)}</p>
                    {alert.last_triggered_at && (
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        Last: {new Date(alert.last_triggered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(alert)} title={alert.is_active ? "Pause" : "Activate"} className="text-text-secondary hover:text-primary transition-colors">
                      {alert.is_active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${alert.is_active ? "bg-pastel-green text-primary" : "bg-black/5 text-text-secondary"}`}>
                      {alert.is_active ? "Active" : "Paused"}
                    </span>
                    <button onClick={() => handleDelete(alert.id)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pastel-red transition-colors">
                      <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
