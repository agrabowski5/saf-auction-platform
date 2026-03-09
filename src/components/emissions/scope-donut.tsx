"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ScopeData {
  scope: number;
  label: string;
  total: number;
  color: string;
}

interface ScopeDonutProps {
  data: ScopeData[];
  size?: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScopeData & { percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border border-[#1e293b] bg-[#111827] px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{item.label}</p>
      <p className="text-muted-foreground">
        {item.total.toLocaleString()} tCO2e ({item.percent.toFixed(1)}%)
      </p>
    </div>
  );
}

export function ScopeDonut({ data, size = 240 }: ScopeDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ width: size, height: size }}
      >
        No emissions data
      </div>
    );
  }

  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);

  const chartData = data.map((d) => ({
    ...d,
    percent: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0,
  }));

  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius * 0.6;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="total"
            nameKey="label"
            strokeWidth={2}
            stroke="#0b1120"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center total */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {grandTotal >= 1000
            ? `${(grandTotal / 1000).toFixed(1)}k`
            : grandTotal.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">tCO2e</span>
      </div>

      {/* Scope labels */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {chartData.map((entry) => (
          <div key={entry.scope} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.label} ({entry.percent.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
