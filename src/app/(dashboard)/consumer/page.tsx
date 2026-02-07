import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { Gavel, TrendingUp, DollarSign, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ConsumerDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  const [activeBids, wonBids, totalSpend] = await Promise.all([
    db.bid.count({ where: { bidderId: userId, status: "active" } }),
    db.bid.count({ where: { bidderId: userId, status: "won" } }),
    db.allocation.aggregate({
      where: { bid: { bidderId: userId } },
      _sum: { totalPrice: true },
    }),
  ]);

  const recentBids = await db.bid.findMany({
    where: { bidderId: userId },
    include: { auction: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consumer Dashboard</h1>
        <p className="text-sm text-muted-foreground">SAF procurement and emissions tracking</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Bids"
          value={activeBids.toString()}
          icon={<Gavel className="h-4 w-4" />}
        />
        <StatCard
          title="Auctions Won"
          value={wonBids.toString()}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Total Spend"
          value={`$${(totalSpend._sum.totalPrice ?? 0).toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="CO2 Reduced"
          value="0 tCO2e"
          subtitle="From SAF purchases"
          icon={<Leaf className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bids</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBids.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No bids yet.{" "}
              <Link href="/auctions" className="text-primary hover:underline">Browse active auctions</Link>
              {" "}to submit your first bid.
            </p>
          ) : (
            <div className="space-y-3">
              {recentBids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{bid.auction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {bid.safCategory} &bull; {bid.quantity.toLocaleString()} gal @ ${bid.maxPrice.toFixed(2)}/gal
                    </p>
                  </div>
                  <Badge variant={bid.status === "won" ? "success" : bid.status === "active" ? "info" : "secondary"}>
                    {bid.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
