"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { BarChart3, DollarSign, Fuel, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#6b7280"];

interface Analytics {
  totalAuctions: number;
  totalVolume: number;
  totalValue: number;
  avgPrice: number;
  avgWelfare: number;
  priceHistory: Array<{ date: string; avgPrice: number; volume: number }>;
  categoryVolumes: Record<string, number>;
  participationRate: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics/market").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-muted-foreground">Loading analytics...</div>;

  const categoryData = Object.entries(data.categoryVolumes).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market Analytics</h1>
        <p className="text-sm text-muted-foreground">Price discovery, liquidity, and market efficiency metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Auctions" value={data.totalAuctions.toString()} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard title="Total Volume" value={`${(data.totalVolume / 1000).toFixed(0)}K gal`} icon={<Fuel className="h-4 w-4" />} />
        <StatCard title="Total Value" value={`$${(data.totalValue / 1000).toFixed(0)}K`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Avg Price" value={`$${data.avgPrice.toFixed(2)}/gal`} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Price History</CardTitle></CardHeader>
          <CardContent>
            {data.priceHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No cleared auctions yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="avgPrice" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Volume by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {categoryData.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
