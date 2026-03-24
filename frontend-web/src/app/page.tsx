import {
  TrendingUp,
  BarChart3,
  Activity,
  Coins,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CryptoTable } from "@/components/dashboard/CryptoTable";
import { SentimentFeed } from "@/components/dashboard/SentimentFeed";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { mockAssets, mockSentimentLogs } from "@/lib/mock-data";

export default function DashboardPage() {
  const totalMarketCap = mockAssets.reduce((sum, a) => sum + a.marketCap, 0);
  const avgSentiment =
    mockAssets.reduce((sum, a) => sum + a.sentimentScore, 0) / mockAssets.length;
  const positiveCount = mockAssets.filter((a) => a.sentimentScore >= 0.3).length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Good Morning!
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here is your crypto market overview for today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Market Cap"
          value={`$${(totalMarketCap / 1_000_000_000_000).toFixed(2)}T`}
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
          value={`${positiveCount}/${mockAssets.length}`}
          subtitle="Positive sentiment"
          icon={TrendingUp}
          bgColor="bg-pastel-yellow border-yellow-500/10"
          iconColor="text-yellow-600"
        />
        <StatCard
          title="News Analyzed"
          value="1,247"
          subtitle="Last 24 hours"
          icon={BarChart3}
          bgColor="bg-purple-50 border-purple-500/10"
          iconColor="text-purple-500"
        />
      </div>

      {/* Top Movers */}
      <TopMovers assets={mockAssets} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CryptoTable assets={mockAssets} />
        </div>
        <div>
          <SentimentFeed logs={mockSentimentLogs} />
        </div>
      </div>
    </div>
  );
}
