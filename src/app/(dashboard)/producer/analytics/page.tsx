import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { DollarSign, TrendingUp, Factory, Gavel } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function ProducerAnalyticsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [totalAsks, wonAsks, totalRevenue, facilityCount] = await Promise.all([
    db.ask.count({ where: { producerId: userId } }),
    db.ask.count({ where: { producerId: userId, status: "won" } }),
    db.allocation.aggregate({ where: { ask: { producerId: userId } }, _sum: { totalPrice: true } }),
    db.productionFacility.count({ where: { producerId: userId } }),
  ]);

  const winRate = totalAsks > 0 ? ((wonAsks / totalAsks) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Producer Analytics</h1><p className="text-sm text-muted-foreground">Revenue trends and facility utilization</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue._sum.totalPrice ?? 0)} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Win Rate" value={`${winRate}%`} subtitle={`${wonAsks} of ${totalAsks} asks`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Active Facilities" value={facilityCount.toString()} icon={<Factory className="h-4 w-4" />} />
        <StatCard title="Total Asks" value={totalAsks.toString()} icon={<Gavel className="h-4 w-4" />} />
      </div>
    </div>
  );
}
