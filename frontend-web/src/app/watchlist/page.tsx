"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, TrendingUp, TrendingDown, Bell, Trash2, Plus, Loader2, LogIn, X, Search } from "lucide-react";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { MiniChart } from "@/components/ui/MiniChart";
import {
  fetchWatchlist, fetchAssets, addToWatchlistDetailed, createAlert,
  generateSparkline, removeFromWatchlist, getToken, fetchPortfolioMood,
  type ApiWatchlistItem, type ApiAsset, type ApiPortfolioMood,
} from "@/lib/api";
import { PortfolioMoodCard } from "@/components/watchlist/PortfolioMoodCard";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text-primary">{symbol} Alarmı</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-colors">
            <X className="h-3.5 w-3.5 text-text-secondary" />
          </button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <p className="text-primary font-bold text-sm">✓ Alarm oluşturuldu!</p>
            <button onClick={onClose} className="mt-3 rounded-xl bg-primary/15 border border-primary/30 px-4 py-2 text-xs font-bold text-primary">Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Koşul</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:border-primary/40 transition-colors">
                <option value="sentiment_below">Sentiment altına düşerse</option>
                <option value="sentiment_above">Sentiment üzerine çıkarsa</option>
                <option value="price_below">Fiyat altına düşerse</option>
                <option value="price_above">Fiyat üzerine çıkarsa</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">
                Eşik {isSentiment ? "(-1.0 / +1.0)" : "($)"}
              </label>
              <input type="number" step={isSentiment ? "0.01" : "1"} value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/15 border border-primary/30 py-2.5 text-sm font-bold text-primary hover:bg-primary/25 transition-colors disabled:opacity-50">
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
  const [customSymbol, setCustomSymbol] = useState("");
  const [customLoading, setCustomLoading] = useState(false);
  const [error, setError] = useState("");

  const watchlistedSymbols = new Set(watchlist.map((w) => w.asset.symbol));
  const filtered = allAssets.filter(
    (a) =>
      !watchlistedSymbols.has(a.symbol) &&
      (a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.symbol.toLowerCase().includes(query.toLowerCase()))
  );

  const handleAdd = async (symbol: string) => {
    setAdding(symbol);
    setError("");
    const { item, error: err } = await addToWatchlistDetailed(symbol);
    if (item) {
      onAdded(item);
    } else {
      setError(err ?? `${symbol} eklenemedi.`);
      setAdding(null);
    }
  };

  const handleCustomAdd = async () => {
    const sym = customSymbol.trim().toUpperCase();
    if (!sym) return;
    if (watchlistedSymbols.has(sym)) { setError(`${sym} zaten watchlist'inizde.`); return; }
    setCustomLoading(true);
    setError("");
    const { item, error: err } = await addToWatchlistDetailed(sym);
    setCustomLoading(false);
    if (item) {
      onAdded(item);
    } else {
      setError(err ?? "Sembol eklenemedi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text-primary">Varlık Ekle</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-colors">
            <X className="h-3.5 w-3.5 text-text-secondary" />
          </button>
        </div>

        {/* Özel sembol girişi */}
        <div className="mb-5 rounded-xl bg-white/4 border border-primary/20 p-4">
          <p className="text-xs font-semibold text-primary/80 mb-2.5">Herhangi bir kripto para ekle</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
              placeholder="LINK, INJ, ARB, PEPE…"
              maxLength={10}
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-bold text-text-primary tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={handleCustomAdd}
              disabled={customLoading || !customSymbol.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-primary/15 border border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
            >
              {customLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Ekle
            </button>
          </div>
        </div>

        {/* Curated liste başlığı + arama */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary/60" />
          <input
            autoFocus
            type="text"
            placeholder="Piyasa listesinde ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/4 border border-white/8 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/30 transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-danger/90 mb-3 flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0">⚠</span> {error}
          </p>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 mb-2">Piyasa Listesi</p>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">
              {watchlistedSymbols.size >= allAssets.length ? "Tüm piyasa varlıkları eklendi." : "Sonuç bulunamadı."}
            </p>
          ) : (
            filtered.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-extrabold",
                    symbolColors[asset.symbol] || "bg-slate-600/80")}>
                    {asset.symbol.slice(0, 4)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary leading-none">{asset.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{formatCurrency(asset.current_price)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(asset.symbol)}
                  disabled={adding === asset.symbol}
                  className="flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/25 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
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
  const [mood, setMood] = useState<ApiPortfolioMood | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);

  const loadMood = async () => {
    const m = await fetchPortfolioMood();
    setMood(m);
  };

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    const load = async () => {
      const [wl, assets] = await Promise.all([
        token ? fetchWatchlist() : Promise.resolve([]),
        fetchAssets(),
        token ? loadMood() : Promise.resolve(),
      ]);
      setWatchlist(wl);
      setAllAssets(assets);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = async (symbol: string) => {
    await removeFromWatchlist(symbol);
    setWatchlist((prev) => prev.filter((w) => w.asset.symbol !== symbol));
    loadMood();
  };

  const handleAdded = (item: ApiWatchlistItem) => {
    setWatchlist((prev) => [...prev, item]);
    loadMood();
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

      {mood && <PortfolioMoodCard mood={mood} />}

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
                {/* Kart başlığı: sol = tıklanabilir detay linki, sağ = aksiyon butonları */}
                <div className="flex items-start justify-between mb-4">
                  <Link href={`/crypto/${asset.id}`} className="flex items-center gap-3 group flex-1 min-w-0">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm",
                      symbolColors[asset.symbol] || "bg-slate-500")}>
                      {asset.symbol}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                        {asset.name}
                      </p>
                      <p className="text-xs text-text-secondary">{asset.symbol}</p>
                    </div>
                  </Link>
                  {/* Aksiyon butonları — her zaman görünür */}
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => setAlertSymbol(asset.symbol)}
                      title={`${asset.symbol} için alarm kur`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-pastel-blue hover:bg-blue-100 transition-colors"
                    >
                      <Bell className="h-4 w-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleRemove(asset.symbol)}
                      title="Watchlist'ten çıkar"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-pastel-red hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  </div>
                </div>

                {/* Kart gövdesi — tıklanınca detay açılır */}
                <Link href={`/crypto/${asset.id}`} className="block">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-2xl font-extrabold text-text-primary">
                        {formatCurrency(asset.current_price)}
                      </p>
                      <div className={cn("flex items-center gap-1 mt-1 text-sm font-bold",
                        asset.change_24h >= 0 ? "text-primary" : "text-danger")}>
                        {asset.change_24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {asset.change_24h >= 0 ? "+" : ""}{asset.change_24h.toFixed(2)}%
                      </div>
                    </div>
                    <MiniChart data={sparkline} color={asset.change_24h >= 0 ? "#10B981" : "#EF4444"} width={100} height={40} />
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-black/5">
                    <div>
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">Market Cap</p>
                      <p className="text-xs font-bold text-text-primary">{formatCompactNumber(asset.market_cap)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">Detay →</p>
                      <p className="text-xs font-bold text-primary">Görüntüle</p>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
