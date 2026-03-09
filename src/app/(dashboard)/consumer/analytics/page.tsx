import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { DollarSign, TrendingUp, Gavel, Leaf } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function ConsumerAnalyticsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [totalBids, wonBids, totalSpend] = await Promise.all([
    db.bid.count({ where: { bidderId: userId } }),
    db.bid.count({ where: { bidderId: userId, status: "won" } }),
    db.allocation.aggregate({ where: { bid: { bidderId: userId } }, _sum: { totalPrice: true } }),
  ]);

  const winRate = totalBids > 0 ? ((wonBids / totalBids) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Consumer Analytics</h1><p className="text-sm text-muted-foreground">Spend trends and procurement history</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Spend" value={formatCurrency(totalSpend._sum.totalPrice ?? 0)} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Win Rate" value={`${winRate}%`} subtitle={`${wonBids} of ${totalBids} bids`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Total Bids" value={totalBids.toString()} icon={<Gavel className="h-4 w-4" />} />
        <StatCard title="CO2e Reduced" value="0 t" icon={<Leaf className="h-4 w-4" />} />
      </div>
    </div>
  );
}
