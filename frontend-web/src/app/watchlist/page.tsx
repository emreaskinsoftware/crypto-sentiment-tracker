"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, TrendingUp, TrendingDown, Bell, Trash2, Plus, Loader2, LogIn, X, Search } from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { MiniChart } from "@/components/ui/MiniChart";
import {
  fetchWatchlist, fetchAssets, addToWatchlist, createAlert,
  generateSparkline, removeFromWatchlist, getToken,
  type ApiWatchlistItem, type ApiAsset,
} from "@/lib/api";

const symbolColors: Record<string, string> = {
  BTC: "bg-orange-500", ETH: "bg-indigo-500", SOL: "bg-purple-500",
  ADA: "bg-blue-500", XRP: "bg-slate-700", DOGE: "bg-yellow-500",
  AVAX: "bg-red-500", DOT: "bg-pink-500",
};

function QuickAlertModal({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const [condition, setCondition] = useState("sentiment_below");
  const [threshold, setThreshold] = useState("-0.5");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const isSentiment = condition.startsWith("sentiment");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(threshold);
    if (isNaN(t)) { setError("Geçerli bir değer girin."); return; }
    setLoading(true);
    const result = await createAlert({ asset_symbol: symbol, condition, threshold: t });
    setLoading(false);
    if (result) setDone(true);
    else setError("Alarm oluşturulamadı.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">{symbol} Alarmı</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-text-secondary" /></button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <p className="text-primary font-bold text-sm">✓ Alarm oluşturuldu!</p>
            <button onClick={onClose} className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Koşul</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-xl bg-bg-light py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 border-none">
                <option value="sentiment_below">Sentiment altına düşerse</option>
                <option value="sentiment_above">Sentiment üzerine çıkarsa</option>
                <option value="price_below">Fiyat altına düşerse</option>
                <option value="price_above">Fiyat üzerine çıkarsa</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Eşik {isSentiment ? "(-1.0 / +1.0)" : "($)"}
              </label>
              <input type="number" step={isSentiment ? "0.01" : "1"} value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-xl bg-bg-light py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 border-none" />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              Alarm Kur
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AddAssetModal({ allAssets, watchlist, onClose, onAdded }: {
  allAssets: ApiAsset[];
  watchlist: ApiWatchlistItem[];
  onClose: () => void;
  onAdded: (item: ApiWatchlistItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  const watchlistedSymbols = new Set(watchlist.map((w) => w.asset.symbol));
  const filtered = allAssets.filter(
    (a) =>
      !watchlistedSymbols.has(a.symbol) &&
      (a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.symbol.toLowerCase().includes(query.toLowerCase()))
  );

  const handleAdd = async (asset: ApiAsset) => {
    setAdding(asset.symbol);
    setError("");
    const result = await addToWatchlist(asset.symbol);
    if (result) {
      onAdded(result);
    } else {
      setError(`${asset.symbol} eklenemedi.`);
    }
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Varlık Ekle</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/5">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        {/* Arama */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            autoFocus
            type="text"
            placeholder="BTC, Ethereum..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && <p className="text-xs text-danger mb-3">{error}</p>}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">
              {watchlistedSymbols.size === allAssets.length ? "Tüm varlıklar watchlist'te." : "Sonuç bulunamadı."}
            </p>
          ) : (
            filtered.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between rounded-xl p-3 hover:bg-bg-light transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white text-xs font-bold",
                    symbolColors[asset.symbol] || "bg-slate-500")}>
                    {asset.symbol}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{asset.name}</p>
                    <p className="text-xs text-text-secondary">{formatCurrency(asset.current_price)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(asset)}
                  disabled={adding === asset.symbol}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
                >
                  {adding === asset.symbol
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Plus className="h-3 w-3" />}
                  Ekle
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<ApiWatchlistItem[]>([]);
  const [allAssets, setAllAssets] = useState<ApiAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    const load = async () => {
      const [wl, assets] = await Promise.all([
        token ? fetchWatchlist() : Promise.resolve([]),
        fetchAssets(),
      ]);
      setWatchlist(wl);
      setAllAssets(assets);
      setLoading(false);
    };
    load();
  }, []);

  const handleRemove = async (symbol: string) => {
    await removeFromWatchlist(symbol);
    setWatchlist((prev) => prev.filter((w) => w.asset.symbol !== symbol));
  };

  const handleAdded = (item: ApiWatchlistItem) => {
    setWatchlist((prev) => [...prev, item]);
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
          <h1 className="text-2xl font-bold text-text-primary">Watchlist</h1>
          <p className="text-sm text-text-secondary mt-1">Track your favorite cryptocurrencies</p>
        </div>
        <div className="rounded-2xl bg-surface-light border-2 border-dashed border-black/10 p-12 text-center">
          <LogIn className="h-12 w-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">Login required</p>
          <p className="text-sm text-text-secondary mt-1">
            Please log in from Settings to manage your watchlist.
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

  const avgSentiment =
    watchlist.length > 0
      ? watchlist.reduce((s, w) => s + (w.asset.change_24h || 0), 0) / watchlist.length
      : 0;

  return (
    <>
      {alertSymbol && <QuickAlertModal symbol={alertSymbol} onClose={() => setAlertSymbol(null)} />}
      {showModal && (
        <AddAssetModal
          allAssets={allAssets}
          watchlist={watchlist}
          onClose={() => setShowModal(false)}
          onAdded={(item) => { handleAdded(item); setShowModal(false); }}
        />
      )}
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Watchlist</h1>
          <p className="text-sm text-text-secondary mt-1">Track your favorite cryptocurrencies</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      <div className="rounded-2xl bg-pastel-green border border-primary/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-5 w-5 fill-warning text-warning" />
          <span className="text-sm font-bold text-text-primary">Portfolio Sentiment Overview</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-secondary">Assets Tracked</p>
            <p className="text-xl font-extrabold text-text-primary">{watchlist.length}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">24h Avg Change</p>
            <p className={cn("text-xl font-extrabold", avgSentiment >= 0 ? "text-primary" : "text-danger")}>
              {avgSentiment >= 0 ? "+" : ""}
              {avgSentiment.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Last Updated</p>
            <p className="text-sm font-bold text-text-primary">
              {watchlist.length > 0 ? new Date(watchlist[0].added_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="rounded-2xl bg-surface-light border-2 border-dashed border-black/10 p-12 text-center">
          <Star className="h-12 w-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">No assets in watchlist</p>
          <p className="text-sm text-text-secondary mt-1">
            Add cryptocurrencies to start tracking
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {watchlist.map((item) => {
            const asset = item.asset;
            const sparkline = generateSparkline(asset.current_price, asset.change_24h > 0 ? 1 : -1);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-surface-light border border-black/5 p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <Link
                    href={`/crypto/${asset.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm",
                        symbolColors[asset.symbol] || "bg-slate-500"
                      )}
                    >
                      {asset.symbol}
                    </div>
                    <div>
                      <p className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                        {asset.name}
                      </p>
                      <p className="text-xs text-text-secondary">{asset.symbol}</p>
                    </div>
                  </Link>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setAlertSymbol(asset.symbol)}
                      title={`${asset.symbol} için alarm kur`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pastel-blue transition-colors"
                    >
                      <Bell className="h-4 w-4 text-text-secondary" />
                    </button>
                    <button
                      onClick={() => handleRemove(asset.symbol)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-pastel-red transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                    </button>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-2xl font-extrabold text-text-primary">
                      {formatCurrency(asset.current_price)}
                    </p>
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1 text-sm font-bold",
                        asset.change_24h >= 0 ? "text-primary" : "text-danger"
                      )}
                    >
                      {asset.change_24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {asset.change_24h >= 0 ? "+" : ""}
                      {asset.change_24h.toFixed(2)}%
                    </div>
                  </div>
                  <MiniChart
                    data={sparkline}
                    color={asset.change_24h >= 0 ? "#10B981" : "#EF4444"}
                    width={100}
                    height={40}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">Market Cap</p>
                    <p className="text-xs font-bold text-text-primary">
                      {formatCompactNumber(asset.market_cap)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">24h Change</p>
                    <SentimentBadge score={asset.change_24h / 100} size="sm" />
                  </div>
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
