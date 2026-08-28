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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50" onClick={onClose}>
      <div className="bg-paper p-6 w-full max-w-md shadow-[3px_3px_0_var(--color-ink)] mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Yeni Alarm Oluştur</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center hover:bg-ink/8">
            <X className="h-4 w-4 text-ink-soft" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Varlık seçimi */}
          <div>
            <label className="text-sm font-medium text-ink-soft block mb-1.5">Kripto Varlık</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-paper py-3 px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-trace-alt/30 border-none">
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>{a.name} ({a.symbol})</option>
              ))}
            </select>
          </div>

          {/* Koşul */}
          <div>
            <label className="text-sm font-medium text-ink-soft block mb-1.5">Alarm Koşulu</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-paper py-3 px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-trace-alt/30 border-none">
              <option value="sentiment_below">Sentiment skoru altına düşerse</option>
              <option value="sentiment_above">Sentiment skoru üzerine çıkarsa</option>
              <option value="price_below">Fiyat altına düşerse</option>
              <option value="price_above">Fiyat üzerine çıkarsa</option>
            </select>
          </div>

          {/* Eşik */}
          <div>
            <label className="text-sm font-medium text-ink-soft block mb-1.5">
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
              className="w-full bg-paper py-3 px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-trace-alt/30 border-none"
            />
          </div>

          {error && <p className="text-sm text-trace">{error}</p>}

          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 border border-ink bg-ink px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] text-paper shadow-[3px_3px_0_var(--color-trace)] transition-all duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
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
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-trace-alt" /></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">Alarmlar</h1>
          <p className="text-sm text-ink-soft mt-1">Fiyat ve duygu eşiklerinizi buradan yönetin</p>
        </div>
        <div className="bg-paper border-2 border-dashed border-ink/20 p-12 text-center">
          <LogIn className="h-12 w-12 text-ink-soft/30 mx-auto mb-4" />
          <p className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Giriş gerekli</p>
          <p className="text-sm text-ink-soft mt-1">Alarmlarınızı yönetmek için Ayarlar sayfasından giriş yapın.</p>
          <Link href="/settings" className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] text-paper shadow-[3px_3px_0_var(--color-trace)] transition-all duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
            <LogIn className="h-4 w-4" /> Ayarlara git
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
            <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">Alarmlar</h1>
            <p className="text-sm text-ink-soft mt-1">Fiyat ve duygu eşiklerinizi buradan yönetin</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] text-paper shadow-[3px_3px_0_var(--color-trace)] transition-all duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
            <Plus className="h-4 w-4" /> New Alert
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-paper border-2 border-dashed border-ink/20 p-12 text-center">
            <Bell className="h-12 w-12 text-ink-soft/30 mx-auto mb-4" />
            <p className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Henüz alarm yok</p>
            <p className="text-sm text-ink-soft mt-1">Click "New Alert" to get notified when conditions are met.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const assetName = assets.find((a) => a.id === alert.asset_id)?.name ?? `Asset #${alert.asset_id}`;
              const assetSymbol = assets.find((a) => a.id === alert.asset_id)?.symbol ?? "";
              return (
                <div key={alert.id} className="flex items-center gap-4 bg-paper border border-ink/20 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex h-11 w-11 items-center justify-center bg-paper-deep">
                    <Bell className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{assetName} {assetSymbol && `(${assetSymbol})`}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{conditionLabel(alert.condition_type, alert.threshold)}</p>
                    {alert.last_triggered_at && (
                      <p className="text-[10px] text-ink-soft mt-0.5">
                        Last: {new Date(alert.last_triggered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(alert)} title={alert.is_active ? "Pause" : "Activate"} className="text-ink-soft hover:text-trace-alt transition-colors">
                      {alert.is_active ? <ToggleRight className="h-6 w-6 text-trace-alt" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <span className={`inline-block border px-2 py-0.5 font-data text-[10px] ${alert.is_active ? "bg-paper-deep text-trace-alt" : "bg-ink/8 text-ink-soft"}`}>
                      {alert.is_active ? "Active" : "Paused"}
                    </span>
                    <button onClick={() => handleDelete(alert.id)} className="flex h-8 w-8 items-center justify-center hover:bg-paper-deep transition-colors">
                      <Trash2 className="h-4 w-4 text-ink-soft hover:text-trace" />
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
