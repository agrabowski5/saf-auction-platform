import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ConsumerBidsPage() {
  const session = await auth();
  const bids = await db.bid.findMany({
    where: { bidderId: session?.user?.id },
    include: { auction: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Bids</h1>
          <p className="text-sm text-muted-foreground">Track all your bid submissions across auctions</p>
        </div>
        <Link href="/auctions">
          <Button variant="outline">Browse Auctions</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="p-3 text-left font-medium">Auction</th>
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-right font-medium">Quantity</th>
                <th className="p-3 text-right font-medium">Max Price</th>
                <th className="p-3 text-right font-medium">Cleared Price</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => (
                <tr key={bid.id} className="border-b hover:bg-accent/30 transition-colors">
                  <td className="p-3 text-sm">
                    <Link href={`/auctions/${bid.auctionId}`} className="hover:text-primary">
                      {bid.auction.title}
                    </Link>
                  </td>
                  <td className="p-3"><Badge variant="outline" className="text-[10px]">{bid.safCategory}</Badge></td>
                  <td className="p-3 text-right text-sm tabular-nums">{bid.quantity.toLocaleString()} gal</td>
                  <td className="p-3 text-right text-sm tabular-nums">{formatCurrency(bid.maxPrice)}</td>
                  <td className="p-3 text-right text-sm tabular-nums">
                    {bid.clearedPrice ? formatCurrency(bid.clearedPrice) : "-"}
                  </td>
                  <td className="p-3">
                    <Badge variant={bid.status === "won" ? "success" : bid.status === "active" ? "info" : bid.status === "lost" ? "destructive" : "secondary"}>
                      {bid.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bids.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No bids submitted yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
