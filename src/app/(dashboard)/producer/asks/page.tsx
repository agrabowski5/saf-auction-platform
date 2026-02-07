import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProducerAsksPage() {
  const session = await auth();
  const asks = await db.ask.findMany({
    where: { producerId: session?.user?.id },
    include: { auction: true, facility: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Asks</h1>
          <p className="text-sm text-muted-foreground">Track all your ask submissions</p>
        </div>
        <Link href="/auctions"><Button variant="outline">Browse Auctions</Button></Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="p-3 text-left font-medium">Auction</th>
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-left font-medium">Facility</th>
                <th className="p-3 text-right font-medium">Quantity</th>
                <th className="p-3 text-right font-medium">Min Price</th>
                <th className="p-3 text-right font-medium">Cleared Price</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {asks.map((ask) => (
                <tr key={ask.id} className="border-b hover:bg-accent/30">
                  <td className="p-3 text-sm"><Link href={`/auctions/${ask.auctionId}`} className="hover:text-primary">{ask.auction.title}</Link></td>
                  <td className="p-3"><Badge variant="outline" className="text-[10px]">{ask.safCategory}</Badge></td>
                  <td className="p-3 text-sm text-muted-foreground">{ask.facility?.name ?? "-"}</td>
                  <td className="p-3 text-right text-sm tabular-nums">{ask.quantity.toLocaleString()} gal</td>
                  <td className="p-3 text-right text-sm tabular-nums">{formatCurrency(ask.minPrice)}</td>
                  <td className="p-3 text-right text-sm tabular-nums">{ask.clearedPrice ? formatCurrency(ask.clearedPrice) : "-"}</td>
                  <td className="p-3"><Badge variant={ask.status === "won" ? "success" : ask.status === "active" ? "info" : "secondary"}>{ask.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {asks.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No asks yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
