"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SentimentChartProps {
  data: { timestamp: string; score: number }[];
  currentScore: number;
  currentLabel: string;
}

// ── Gauge fallback (az veri varsa) ───────────────────────────────────────────
function SentimentGauge({ score, label }: { score: number; label: string }) {
  const pct = ((score + 1) / 2) * 100; // -1..+1 → 0..100%
  const isPos = score >= 0.3;
  const isNeg = score <= -0.3;
  const color = isPos ? "var(--color-trace-alt)" : isNeg ? "var(--color-trace)" : "var(--color-ink-faint)";
  const bgColor = isPos ? "rgba(16,185,129,0.08)" : isNeg ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";
  const borderColor = isPos ? "rgba(16,185,129,0.2)" : isNeg ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)";

  return (
    <div
      className="p-4 flex flex-col gap-3"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color }}>
          {score > 0 ? "+" : ""}{score.toFixed(3)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: `${color}22`, color }}
        >
          {label}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.07)" }}>
        {/* Gradient fill */}
        <div className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(to right, var(--color-trace) 0%, var(--color-ink-faint) 50%, var(--color-trace-alt) 100%)",
            opacity: 0.3,
          }} />
        {/* Pointer */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 border-white shadow"
          style={{ left: `${pct}%`, background: color }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-ink-soft">
        <span>-1.0 Negatif</span>
        <span>0 Nötr</span>
        <span>+1.0 Pozitif</span>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score: number = payload[0]?.value ?? 0;
  const isPos = score >= 0.3;
  const isNeg = score <= -0.3;
  const color = isPos ? "var(--color-trace-alt)" : isNeg ? "var(--color-trace)" : "var(--color-ink-faint)";
  return (
    <div className="border border-ink/12 bg-paper px-3 py-2 shadow-[2px_2px_0_var(--color-ink)] text-xs">
      <p className="text-ink-soft mb-1">{label}</p>
      <p className="font-bold" style={{ color }}>
        {score > 0 ? "+" : ""}{score.toFixed(3)}
        <span className="ml-1.5 font-normal opacity-60">
          {isPos ? "Positive" : isNeg ? "Negative" : "Neutral"}
        </span>
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SentimentChart({ data, currentScore, currentLabel }: SentimentChartProps) {
  // 3'ten az nokta varsa gauge göster
  if (data.length < 3) {
    return <SentimentGauge score={currentScore} label={currentLabel} />;
  }

  const step = Math.max(1, Math.floor(data.length / 6));
  const chartData = data.map((d, i) => {
    const date = new Date(d.timestamp);
    const label = i % step === 0
      ? (data.length <= 48
        ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
      : "";
    return { label, score: parseFloat(d.score.toFixed(3)) };
  });

  const avgScore = data.reduce((s, d) => s + d.score, 0) / data.length;
  const isPos = avgScore >= 0.1;
  const isNeg = avgScore <= -0.1;
  const lineColor = isPos ? "var(--color-trace-alt)" : isNeg ? "var(--color-trace)" : "var(--color-ink-faint)";

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
          tickLine={false}
          axisLine={false}
          domain={[-1, 1]}
          ticks={[-1, 0, 1]}
          tickFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
          width={28}
        />

        <Tooltip content={<ChartTooltip />} />

        {/* Sıfır çizgisi */}
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 3" />

        <Area
          type="monotone"
          dataKey="score"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#sentGrad)"
          dot={false}
          activeDot={{ r: 4, fill: lineColor, stroke: "var(--color-paper)", strokeWidth: 1.5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
