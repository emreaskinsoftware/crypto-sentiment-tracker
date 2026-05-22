import { TrendingUp, BarChart3, Activity, Coins } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CryptoTable } from "@/components/dashboard/CryptoTable";
import { SentimentFeed } from "@/components/dashboard/SentimentFeed";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  fetchAssets,
  generateSparkline,
  fetchDashboardSummary,
  fetchSentimentSummary,
  fetchSentimentLogs,
  type ApiAsset,
  type ApiSentimentSummary,
} from "@/lib/api";
import type { CryptoAsset, SentimentLog } from "@/lib/mock-data";

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
    sentimentScore: sentiment?.current_score ?? 0,
    sentimentLabel: (sentiment?.status ?? "Neutral") as
      | "Positive"
      | "Neutral"
      | "Negative",
    sparkline: generateSparkline(asset.current_price, asset.change_24h > 0 ? 1 : -1),
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

  const logArrays = await Promise.all(
    assets.slice(0, 3).map((a) => fetchSentimentLogs(a.id, 4))
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

  const avgSentiment = summary.avg_sentiment_score;
  const positiveCount = summary.bullish_count;

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <DashboardHeader />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Market Cap"
          value={`$${(summary.total_market_cap / 1_000_000_000_000).toFixed(2)}T`}
          subtitle="Takip edilen varlıklar"
          icon={Coins}
          variant="green"
        />
        <StatCard
          title="Avg Sentiment"
          value={avgSentiment > 0 ? `+${avgSentiment.toFixed(2)}` : avgSentiment.toFixed(2)}
          subtitle="Tüm varlıklar ortalaması"
          icon={Activity}
          variant="blue"
        />
        <StatCard
          title="Bullish Assets"
          value={`${positiveCount}/${summary.total_assets}`}
          subtitle="Pozitif sentiment"
          icon={TrendingUp}
          variant="yellow"
        />
        <StatCard
          title="News Analyzed"
          value={sentimentLogs.length > 0 ? `${summary.total_assets * 28}+` : "—"}
          subtitle="Son 24 saat"
          icon={BarChart3}
          variant="purple"
        />
      </div>

      <TopMovers assets={cryptoAssets} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CryptoTable assets={cryptoAssets} />
        </div>
        <div>
          <SentimentFeed logs={sentimentLogs} />
        </div>
      </div>
    </div>
  );
}
