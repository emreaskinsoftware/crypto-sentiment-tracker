"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface SentimentChartProps {
  data: { timestamp: string; score: number }[];
}

export function SentimentChart({ data }: SentimentChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: d.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#4A705E" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#4A705E" }}
          tickLine={false}
          axisLine={false}
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: "13px",
            fontFamily: "Plus Jakarta Sans",
          }}
          formatter={(value) => [Number(value).toFixed(2), "Sentiment"]}
        />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.score >= 0.3
                  ? "#10B981"
                  : entry.score <= -0.3
                    ? "#EF4444"
                    : "#F59E0B"
              }
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
