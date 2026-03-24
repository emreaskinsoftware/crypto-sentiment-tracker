export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  sentimentScore: number;
  sentimentLabel: "Positive" | "Neutral" | "Negative";
  sparkline: number[];
  isWatchlisted: boolean;
}

export interface SentimentLog {
  id: string;
  assetId: string;
  score: number;
  source: string;
  headline: string;
  timestamp: string;
}

export interface PriceHistory {
  timestamp: string;
  price: number;
  volume: number;
}

function generateSparkline(base: number, trend: number): number[] {
  const data: number[] = [];
  let value = base;
  for (let i = 0; i < 24; i++) {
    value += (Math.random() - 0.5 + trend * 0.1) * base * 0.02;
    data.push(Math.round(value * 100) / 100);
  }
  return data;
}

export const mockAssets: CryptoAsset[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 67432.18,
    change24h: 2.34,
    volume24h: 28_500_000_000,
    marketCap: 1_325_000_000_000,
    sentimentScore: 0.72,
    sentimentLabel: "Positive",
    sparkline: generateSparkline(67000, 1),
    isWatchlisted: true,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 3521.45,
    change24h: -1.12,
    volume24h: 15_200_000_000,
    marketCap: 423_000_000_000,
    sentimentScore: 0.45,
    sentimentLabel: "Neutral",
    sparkline: generateSparkline(3500, -0.5),
    isWatchlisted: true,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 142.87,
    change24h: 5.67,
    volume24h: 3_800_000_000,
    marketCap: 62_000_000_000,
    sentimentScore: 0.85,
    sentimentLabel: "Positive",
    sparkline: generateSparkline(140, 2),
    isWatchlisted: false,
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    price: 0.458,
    change24h: -3.21,
    volume24h: 520_000_000,
    marketCap: 16_200_000_000,
    sentimentScore: -0.35,
    sentimentLabel: "Negative",
    sparkline: generateSparkline(0.46, -1),
    isWatchlisted: false,
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "Ripple",
    price: 0.527,
    change24h: 1.89,
    volume24h: 1_200_000_000,
    marketCap: 28_500_000_000,
    sentimentScore: 0.58,
    sentimentLabel: "Positive",
    sparkline: generateSparkline(0.52, 0.8),
    isWatchlisted: true,
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.0832,
    change24h: -0.45,
    volume24h: 680_000_000,
    marketCap: 11_800_000_000,
    sentimentScore: 0.12,
    sentimentLabel: "Neutral",
    sparkline: generateSparkline(0.083, -0.2),
    isWatchlisted: false,
  },
  {
    id: "avalanche",
    symbol: "AVAX",
    name: "Avalanche",
    price: 35.92,
    change24h: 4.15,
    volume24h: 890_000_000,
    marketCap: 13_200_000_000,
    sentimentScore: 0.68,
    sentimentLabel: "Positive",
    sparkline: generateSparkline(35, 1.5),
    isWatchlisted: false,
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    price: 7.23,
    change24h: -2.78,
    volume24h: 340_000_000,
    marketCap: 9_800_000_000,
    sentimentScore: -0.52,
    sentimentLabel: "Negative",
    sparkline: generateSparkline(7.3, -1.2),
    isWatchlisted: true,
  },
];

export const mockSentimentLogs: SentimentLog[] = [
  {
    id: "1",
    assetId: "bitcoin",
    score: 0.82,
    source: "CoinDesk",
    headline: "Bitcoin ETF inflows reach record highs as institutional demand surges",
    timestamp: "2024-03-15T14:30:00Z",
  },
  {
    id: "2",
    assetId: "bitcoin",
    score: 0.65,
    source: "Reddit",
    headline: "BTC breaking resistance levels, community bullish on next target",
    timestamp: "2024-03-15T13:00:00Z",
  },
  {
    id: "3",
    assetId: "bitcoin",
    score: -0.15,
    source: "CryptoNews",
    headline: "Regulatory concerns grow as SEC delays Bitcoin ETF decision",
    timestamp: "2024-03-15T11:45:00Z",
  },
  {
    id: "4",
    assetId: "ethereum",
    score: 0.45,
    source: "The Block",
    headline: "Ethereum Layer 2 solutions see record TVL growth",
    timestamp: "2024-03-15T10:30:00Z",
  },
  {
    id: "5",
    assetId: "ethereum",
    score: -0.28,
    source: "Reddit",
    headline: "Gas fees spike again causing frustration among DeFi users",
    timestamp: "2024-03-15T09:15:00Z",
  },
  {
    id: "6",
    assetId: "solana",
    score: 0.91,
    source: "CoinTelegraph",
    headline: "Solana ecosystem explodes with new DeFi protocols and NFT projects",
    timestamp: "2024-03-15T12:00:00Z",
  },
  {
    id: "7",
    assetId: "cardano",
    score: -0.45,
    source: "CryptoSlate",
    headline: "Cardano faces criticism over slow development pace",
    timestamp: "2024-03-15T08:00:00Z",
  },
  {
    id: "8",
    assetId: "ripple",
    score: 0.72,
    source: "Bloomberg",
    headline: "Ripple wins key legal battle, XRP price responds positively",
    timestamp: "2024-03-15T07:30:00Z",
  },
];

export function generatePriceHistory(basePrice: number, days: number = 30): PriceHistory[] {
  const data: PriceHistory[] = [];
  let price = basePrice * 0.85;
  const now = new Date();

  for (let i = days * 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000);
    price += (Math.random() - 0.48) * basePrice * 0.01;
    price = Math.max(price, basePrice * 0.7);
    const volume = Math.round((Math.random() * 500000 + 100000) * 100) / 100;
    data.push({
      timestamp: timestamp.toISOString(),
      price: Math.round(price * 100) / 100,
      volume,
    });
  }
  return data;
}

export function generateSentimentHistory(days: number = 30): { timestamp: string; score: number }[] {
  const data: { timestamp: string; score: number }[] = [];
  let score = 0.3;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 86400000);
    score += (Math.random() - 0.48) * 0.2;
    score = Math.max(-1, Math.min(1, score));
    data.push({
      timestamp: timestamp.toISOString(),
      score: Math.round(score * 100) / 100,
    });
  }
  return data;
}
