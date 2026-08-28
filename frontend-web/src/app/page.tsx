import { ReadoutBar } from "@/components/ui/Readout";
import { PenTrace, type TracePoint } from "@/components/dashboard/PenTrace";
import { CryptoTable } from "@/components/dashboard/CryptoTable";
import { SentimentFeed } from "@/components/dashboard/SentimentFeed";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  fetchAssets,
  fetchDashboardSummary,
  fetchSentimentSummary,
  fetchSentimentLogs,
  fetchChartData,
  type ApiAsset,
  type ApiSentimentSummary,
} from "@/lib/api";
import type { CryptoAsset, SentimentLog } from "@/lib/mock-data";

/** Bu varlık için gerçekten haber ölçülmüş mü? */
function measured(s: ApiSentimentSummary | null): boolean {
  if (!s) return false;
  return s.news_count_last_hour > 0 || s.current_score !== 0;
}

function mapAsset(
  asset: ApiAsset,
  sentiment: ApiSentimentSummary | null
): CryptoAsset {
  return {
    id: asset.id.toString(),
    symbol: asset.symbol,
    name: asset.name,
    price: asset.current_price,
    change24h: asset.change_24h,
    volume24h: asset.volume_24h,
    marketCap: asset.market_cap,
    // API ölçüm yokken de 200 + {current_score: 0, news_count_last_hour: 0}
    // dönüyor. Bunu 0.0 "nötr" diye göstermek uydurma ölçüm olurdu.
    sentimentScore: measured(sentiment) ? sentiment!.current_score : null,
    sentimentLabel: (sentiment?.status ?? "Neutral") as
      | "Positive"
      | "Neutral"
      | "Negative",
    sparkline: [],
    isWatchlisted: false,
  };
}

export default async function DashboardPage() {
  const [assets, summary] = await Promise.all([
    fetchAssets(),
    fetchDashboardSummary(),
  ]);

  const sentiments = await Promise.all(
    assets.map((a) => fetchSentimentSummary(a.symbol))
  );

  const cryptoAssets: CryptoAsset[] = assets.map((asset, i) =>
    mapAsset(asset, sentiments[i])
  );

  // Şeridin taşıyıcı kanalı. market_cap Binance public API'de her zaman 0
  // geldiği için sıralama ölçütü hacim; BTC varsa referans kanal olarak öncelikli.
  const lead =
    assets.find((a) => a.symbol === "BTC") ??
    [...assets].sort((a, b) => b.volume_24h - a.volume_24h)[0];

  // 24 saatte yeterli örnek yoksa pencereyi 7 güne aç — cihaz seyrek
  // çalıştığında şerit iki noktalık düz bir çizgiye düşmesin.
  let traceWindow: "24h" | "7d" = "24h";
  let chart = lead ? await fetchChartData(lead.symbol, "24h") : null;
  const scoredIn = (c: typeof chart) =>
    c?.data.filter((p) => p.sentiment_score !== null).length ?? 0;

  if (lead && scoredIn(chart) < 6) {
    const wider = await fetchChartData(lead.symbol, "7d");
    if (scoredIn(wider) > scoredIn(chart)) {
      chart = wider;
      traceWindow = "7d";
    }
  }

  const tracePoints: TracePoint[] =
    chart?.data.map((p) => ({
      t: p.timestamp,
      sentiment: p.sentiment_score,
      price: p.price,
    })) ?? [];

  // Defteri duygusu ölçülmüş varlıklardan doldur; ilk üç varlıkta hiç haber
  // olmayabilir (o zaman defter boş görünürdü).
  const withSentiment = assets.filter((_, i) => measured(sentiments[i]));
  const logSources = (withSentiment.length > 0 ? withSentiment : assets).slice(0, 4);
  const logArrays = await Promise.all(
    logSources.map((a) => fetchSentimentLogs(a.id, 4))
  );
  const sentimentLogs: SentimentLog[] = logArrays
    .flat()
    .sort(
      (a, b) =>
        new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime()
    )
    .slice(0, 8)
    .map((log) => ({
      id: log.id.toString(),
      assetId: log.asset_id.toString(),
      score: log.score,
      source: log.source,
      headline: log.headline,
      timestamp: log.analyzed_at,
    }));

  const avg = summary.avg_sentiment_score;
  const scored = chart?.data.filter((p) => p.sentiment_score !== null).length ?? 0;

  return (
    <div className="space-y-5">
      <DashboardHeader />

      {/* İmza: iki kanallı şerit kaydı */}
      {lead && (
        <PenTrace
          symbol={lead.symbol}
          name={lead.name}
          points={tracePoints}
          window={traceWindow}
        />
      )}

      <ReadoutBar
        items={[
          {
            label: "Ölçülen kanal",
            value: `${withSentiment.length}/${assets.length}`,
            note:
              withSentiment.length < assets.length
                ? `${assets.length - withSentiment.length} kanalda henüz haber yok`
                : "tüm kanallar ölçülüyor",
          },
          {
            label: "Ortalama duygu",
            value: `${avg > 0 ? "+" : ""}${avg.toFixed(2)}`,
            note: "−1.00 … +1.00",
            tone: avg >= 0.3 ? "trace-alt" : avg <= -0.3 ? "trace" : "ink",
          },
          {
            label: "Pozitif kanal",
            value: `${summary.bullish_count}/${assets.length}`,
            note: `${summary.bearish_count} negatif · ${summary.neutral_count} nötr`,
          },
          {
            label: "Şeritteki örnek",
            value: scored > 0 ? String(scored) : "—",
            note: lead
              ? `${lead.symbol} · ${traceWindow === "7d" ? "son 7 gün" : "son 24 saat"}`
              : "veri yok",
          },
        ]}
      />

      <TopMovers assets={cryptoAssets} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CryptoTable assets={cryptoAssets} />
        </div>
        <SentimentFeed logs={sentimentLogs} />
      </div>
    </div>
  );
}
