"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SectorData {
  sectorName: string;
  total: number;
  color: string;
  percentage: number;
}

interface SectorBreakdownChartProps {
  data: SectorData[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SectorData }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border border-[#1e293b] bg-[#111827] px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{item.sectorName}</p>
      <p className="text-muted-foreground">
        {item.total.toLocaleString()} tCO2e ({item.percentage.toFixed(1)}%)
      </p>
    </div>
  );
}

export function SectorBreakdownChart({ data }: SectorBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No sector data available
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const barHeight = 36;
  const chartHeight = Math.max(sorted.length * barHeight + 40, 120);

  return (
    <div style={{ width: "100%", height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="sectorName"
            width={130}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            barSize={20}
            label={({ x, y, width, value, index }: any) => {
              const item = sorted[index];
              return (
                <text
                  x={x + width + 6}
                  y={y + 14}
                  fill="#94a3b8"
                  fontSize={11}
                  textAnchor="start"
                >
                  {Number(value).toLocaleString()} tCO2e ({item.percentage.toFixed(1)}%)
                </text>
              );
            }}
          >
            {sorted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
