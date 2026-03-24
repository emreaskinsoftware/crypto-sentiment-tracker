"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistory } from "@/lib/mock-data";

interface PriceChartProps {
  data: PriceHistory[];
  color?: string;
}

export function PriceChart({ data, color = "#10B981" }: PriceChartProps) {
  const chartData = data.filter((_, i) => i % 6 === 0).map((d) => ({
    time: new Date(d.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: d.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#4A705E" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#4A705E" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toLocaleString()}`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: "13px",
            fontFamily: "Plus Jakarta Sans",
          }}
          formatter={(value) => [
            `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            "Price",
          ]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
