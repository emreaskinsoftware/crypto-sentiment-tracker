"use client";

import { useState, useEffect, useRef } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60" onClick={onClose}>
      <div className="bg-paper border border-ink/12 p-6 w-full max-w-sm shadow-[3px_3px_0_var(--color-ink)] mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">{symbol} Alarmı</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center hover:bg-grid-fine/40 transition-colors">
            <X className="h-3.5 w-3.5 text-ink-soft" />
          </button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <p className="text-trace-alt font-bold text-sm">✓ Alarm oluşturuldu!</p>
            <button onClick={onClose} className="mt-3 bg-trace-alt/15 border border-trace-alt/30 px-4 py-2 text-xs font-bold text-trace-alt">Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1.5">Koşul</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-grid-fine/40 border border-ink/12 py-2.5 px-3 text-sm text-ink focus:outline-none focus:border-trace-alt/40 transition-colors">
                <option value="sentiment_below">Sentiment altına düşerse</option>
                <option value="sentiment_above">Sentiment üzerine çıkarsa</option>
                <option value="price_below">Fiyat altına düşerse</option>
                <option value="price_above">Fiyat üzerine çıkarsa</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1.5">
                Eşik {isSentiment ? "(-1.0 / +1.0)" : "($)"}
              </label>
              <input type="number" step={isSentiment ? "0.01" : "1"} value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-grid-fine/40 border border-ink/12 py-2.5 px-3 text-sm text-ink focus:outline-none focus:border-trace-alt/40 transition-colors" />
            </div>
            {error && <p className="text-xs text-trace">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-trace-alt/15 border border-trace-alt/30 py-2.5 text-sm font-bold text-trace-alt hover:bg-trace-alt/25 transition-colors disabled:opacity-50">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60" onClick={onClose}>
      <div className="bg-paper border border-ink/12 p-6 w-full max-w-md shadow-[3px_3px_0_var(--color-ink)] mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Varlık Ekle</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center hover:bg-grid-fine/40 transition-colors">
            <X className="h-3.5 w-3.5 text-ink-soft" />
          </button>
        </div>

        {/* Özel sembol girişi */}
        <div className="mb-5 bg-grid-fine/40 border border-trace-alt/20 p-4">
          <p className="text-xs font-semibold text-trace-alt/80 mb-2.5">Herhangi bir kripto para ekle</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
              placeholder="LINK, INJ, ARB, PEPE…"
              maxLength={10}
              className="flex-1 bg-grid-fine/40 border border-ink/12 px-3 py-2.5 text-sm font-bold text-ink tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-soft/40 focus:outline-none focus:border-trace-alt/50 transition-colors"
            />
            <button
              onClick={handleCustomAdd}
              disabled={customLoading || !customSymbol.trim()}
              className="flex items-center gap-1.5 bg-trace-alt/15 border border-trace-alt/30 px-4 py-2.5 text-sm font-bold text-trace-alt hover:bg-trace-alt/25 transition-colors disabled:opacity-40"
            >
              {customLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Ekle
            </button>
          </div>
        </div>

        {/* Curated liste başlığı + arama */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft/60" />
          <input
            autoFocus
            type="text"
            placeholder="Piyasa listesinde ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-grid-fine/40 border border-ink/12 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-trace-alt/30 transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-trace/90 mb-3 flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0">⚠</span> {error}
          </p>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-soft/50 mb-2">Piyasa Listesi</p>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-6">
              {watchlistedSymbols.size >= allAssets.length ? "Tüm piyasa varlıkları eklendi." : "Sonuç bulunamadı."}
            </p>
          ) : (
            filtered.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between px-3 py-2.5 hover:bg-grid-fine/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center  text-paper text-[10px] font-extrabold",
                    "bg-ink")}>
                    {asset.symbol.slice(0, 4)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink leading-none">{asset.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{formatCurrency(asset.current_price)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(asset.symbol)}
                  disabled={adding === asset.symbol}
                  className="flex items-center gap-1 bg-trace-alt/15 border border-trace-alt/25 px-3 py-1.5 text-xs font-bold text-trace-alt hover:bg-trace-alt/25 transition-colors disabled:opacity-50"
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

  // Bkz. alerts sayfası: uçuştaki eski bir poll yanıtının yerel ekleme/silme
  // işlemini geri almasını engelleyen revizyon sayacı.
  const revision = useRef(0);

  useEffect(() => {
    const load = async () => {
      const startedAt = revision.current;
      // Token her turda okunur; aksi hâlde poll mount anındaki değere
      // sabitlenir ve araya giren giriş/çıkışı hiç görmez.
      const token = getToken();
      setIsLoggedIn(!!token);
      try {
        const [wl, assets] = await Promise.all([
          token ? fetchWatchlist() : Promise.resolve([]),
          fetchAssets(),
          token ? loadMood() : Promise.resolve(),
        ]);
        if (revision.current !== startedAt) return;
        setWatchlist(wl);
        setAllAssets(assets);
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

  const handleRemove = async (symbol: string) => {
    await removeFromWatchlist(symbol);
    revision.current += 1;
    setWatchlist((prev) => prev.filter((w) => w.asset.symbol !== symbol));
    loadMood();
  };

  const handleAdded = (item: ApiWatchlistItem) => {
    revision.current += 1;
    setWatchlist((prev) => [...prev, item]);
    loadMood();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-trace-alt" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">Takip listesi</h1>
          <p className="text-sm text-ink-soft mt-1">İzlemek istediğiniz kanalları buraya ekleyin</p>
        </div>
        <div className="bg-paper border-2 border-dashed border-ink/20 p-12 text-center">
          <LogIn className="h-12 w-12 text-ink-soft/30 mx-auto mb-4" />
          <p className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Giriş gerekli</p>
          <p className="text-sm text-ink-soft mt-1">
            Takip listenizi yönetmek için Ayarlar sayfasından giriş yapın.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] text-paper shadow-[3px_3px_0_var(--color-trace)] transition-all duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <LogIn className="h-4 w-4" />
            Ayarlara git
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
          <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">Takip listesi</h1>
          <p className="text-sm text-ink-soft mt-1">İzlemek istediğiniz kanalları buraya ekleyin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] text-paper shadow-[3px_3px_0_var(--color-trace)] transition-all duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      {mood && <PortfolioMoodCard mood={mood} />}

      {watchlist.length === 0 ? (
        <div className="bg-paper border-2 border-dashed border-ink/20 p-12 text-center">
          <Star className="h-12 w-12 text-ink-soft/30 mx-auto mb-4" />
          <p className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Takip listesi boş</p>
          <p className="text-sm text-ink-soft mt-1">
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
                className="bg-paper border border-ink/20 p-5 hover:shadow-md transition-all"
              >
                {/* Kart başlığı: sol = tıklanabilir detay linki, sağ = aksiyon butonları */}
                <div className="flex items-start justify-between mb-4">
                  <Link href={`/crypto/${asset.id}`} className="flex items-center gap-3 group flex-1 min-w-0">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center  text-paper text-xs font-bold shadow-sm",
                      "bg-ink")}>
                      {asset.symbol}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-ink group-hover:text-trace-alt transition-colors truncate">
                        {asset.name}
                      </p>
                      <p className="text-xs text-ink-soft">{asset.symbol}</p>
                    </div>
                  </Link>
                  {/* Aksiyon butonları — her zaman görünür */}
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => setAlertSymbol(asset.symbol)}
                      title={`${asset.symbol} için alarm kur`}
                      className="flex h-9 w-9 items-center justify-center bg-paper-deep hover:bg-blue-100 transition-colors"
                    >
                      <Bell className="h-4 w-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleRemove(asset.symbol)}
                      title="Watchlist'ten çıkar"
                      className="flex h-9 w-9 items-center justify-center bg-paper-deep hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-trace" />
                    </button>
                  </div>
                </div>

                {/* Kart gövdesi — tıklanınca detay açılır */}
                <Link href={`/crypto/${asset.id}`} className="block">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-2xl font-extrabold text-ink">
                        {formatCurrency(asset.current_price)}
                      </p>
                      <div className={cn("flex items-center gap-1 mt-1 text-sm font-bold",
                        asset.change_24h >= 0 ? "text-trace-alt" : "text-trace")}>
                        {asset.change_24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {asset.change_24h >= 0 ? "+" : ""}{asset.change_24h.toFixed(2)}%
                      </div>
                    </div>
                    <MiniChart data={sparkline} color={asset.change_24h >= 0 ? "var(--color-trace-alt)" : "var(--color-trace)"} width={100} height={40} />
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-ink/20">
                    <div>
                      <p className="text-[10px] text-ink-soft uppercase tracking-wider">Market Cap</p>
                      <p className="text-xs font-bold text-ink">{formatCompactNumber(asset.market_cap)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-ink-soft uppercase tracking-wider">Detay →</p>
                      <p className="text-xs font-bold text-trace-alt">Görüntüle</p>
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
