import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { Factory, TrendingUp, DollarSign, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ProducerDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  const [facilityCount, activeAsks, wonAsks] = await Promise.all([
    db.productionFacility.count({ where: { producerId: userId } }),
    db.ask.count({ where: { producerId: userId, status: "active" } }),
    db.ask.count({ where: { producerId: userId, status: "won" } }),
  ]);

  const recentAsks = await db.ask.findMany({
    where: { producerId: userId },
    include: { auction: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Producer Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage your SAF production and auction participation</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Production Facilities"
          value={facilityCount.toString()}
          icon={<Factory className="h-4 w-4" />}
        />
        <StatCard
          title="Active Asks"
          value={activeAsks.toString()}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Auctions Won"
          value={wonAsks.toString()}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Certificates"
          value="0"
          icon={<FileCheck className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Asks</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAsks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No asks yet.{" "}
              <Link href="/auctions" className="text-primary hover:underline">Browse active auctions</Link>
              {" "}to submit your first ask.
            </p>
          ) : (
            <div className="space-y-3">
              {recentAsks.map((ask) => (
                <div key={ask.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{ask.auction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ask.safCategory} &bull; {ask.quantity.toLocaleString()} gal @ ${ask.minPrice.toFixed(2)}/gal
                    </p>
                  </div>
                  <Badge variant={ask.status === "won" ? "success" : ask.status === "active" ? "info" : "secondary"}>
                    {ask.status}
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
