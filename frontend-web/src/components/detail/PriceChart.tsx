"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistory } from "@/lib/mock-data";

interface PriceChartProps {
  data: PriceHistory[];
  color?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-ink/12 bg-paper px-3 py-2 shadow-[2px_2px_0_var(--color-ink)] text-xs">
      <p className="text-ink-soft mb-1">{label}</p>
      <p className="font-bold text-ink">
        ${Number(payload[0]?.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function PriceChart({ data, color = "var(--color-trace-alt)" }: PriceChartProps) {
  // Veri noktalarını seyrekleştir — çok fazla nokta X eksenini karıştırır
  const maxLabels = 7;
  const step = Math.max(1, Math.floor(data.length / maxLabels));
  const chartData = data.map((d, i) => ({
    time: i % step === 0
      ? new Date(d.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "",
    price: d.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${Number(v).toLocaleString("en-US", { notation: "compact" })}`}
          domain={["auto", "auto"]}
          width={56}
          tickCount={4}
        />

        <Tooltip content={<PriceTooltip />} />

        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill="url(#priceGrad)"
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "var(--color-paper)", strokeWidth: 1.5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
