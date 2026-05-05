import { TrendingUp, BarChart3, Activity, Coins } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CryptoTable } from "@/components/dashboard/CryptoTable";
import { SentimentFeed } from "@/components/dashboard/SentimentFeed";
import { TopMovers } from "@/components/dashboard/TopMovers";
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

  // Fetch all sentiment summaries in parallel
  const sentiments = await Promise.all(
    assets.map((a) => fetchSentimentSummary(a.symbol))
  );

  const cryptoAssets: CryptoAsset[] = assets.map((asset, i) =>
    mapAsset(asset, sentiments[i])
  );

  // Fetch recent sentiment logs from top 3 assets for the feed
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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Good Morning!</h1>
        <p className="text-sm text-text-secondary mt-1">
          Here is your crypto market overview for today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Market Cap"
          value={`$${(summary.total_market_cap / 1_000_000_000_000).toFixed(2)}T`}
          subtitle="Tracked assets"
          icon={Coins}
          bgColor="bg-pastel-green border-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Avg Sentiment"
          value={avgSentiment > 0 ? `+${avgSentiment.toFixed(2)}` : avgSentiment.toFixed(2)}
          subtitle="Across all assets"
          icon={Activity}
          bgColor="bg-pastel-blue border-blue-500/10"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Bullish Assets"
          value={`${positiveCount}/${summary.total_assets}`}
          subtitle="Positive sentiment"
          icon={TrendingUp}
          bgColor="bg-pastel-yellow border-yellow-500/10"
          iconColor="text-yellow-600"
        />
        <StatCard
          title="News Analyzed"
          value={sentimentLogs.length > 0 ? `${summary.total_assets * 28}+` : "—"}
          subtitle="Last 24 hours"
          icon={BarChart3}
          bgColor="bg-purple-50 border-purple-500/10"
          iconColor="text-purple-500"
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
