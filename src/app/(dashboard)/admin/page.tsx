import { db } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { Gavel, Users, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency, formatGallons } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseJsonArray } from "@/lib/utils";

export default async function AdminDashboard() {
  const [auctionCount, userCount, activeAuctions, recentAuctions] = await Promise.all([
    db.auction.count(),
    db.user.count({ where: { isDemo: false } }).catch(() => 0),
    db.auction.count({ where: { status: "open" } }),
    db.auction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const allUsers = await db.user.count();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform overview and management</p>
        </div>
        <Link href="/admin/auctions/new">
          <Button>Create Auction</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Auctions"
          value={auctionCount.toString()}
          icon={<Gavel className="h-4 w-4" />}
        />
        <StatCard
          title="Active Auctions"
          value={activeAuctions.toString()}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Total Users"
          value={allUsers.toString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Platform Volume"
          value="$0"
          subtitle="All-time settled"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Auctions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAuctions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No auctions yet. Create your first auction.</p>
          ) : (
            <div className="space-y-3">
              {recentAuctions.map((auction) => (
                <Link
                  key={auction.id}
                  href={`/admin/auctions/${auction.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{auction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {parseJsonArray(auction.categories).join(", ")} &bull; {auction.auctionType.toUpperCase()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      auction.status === "open" ? "success" :
                      auction.status === "settled" ? "info" :
                      auction.status === "draft" ? "secondary" : "outline"
                    }
                  >
                    {auction.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
