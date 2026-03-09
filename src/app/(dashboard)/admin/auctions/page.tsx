import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseJsonArray } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminAuctionsPage() {
  const auctions = await db.auction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bids: true, asks: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Auctions</h1>
          <p className="text-sm text-muted-foreground">Create, monitor, and clear auctions</p>
        </div>
        <Link href="/admin/auctions/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create Auction</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="p-3 text-left font-medium">Title</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-left font-medium">Categories</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-center font-medium">Bids</th>
                <th className="p-3 text-center font-medium">Asks</th>
                <th className="p-3 text-left font-medium">End Time</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((auction) => (
                <tr key={auction.id} className="border-b hover:bg-accent/30 transition-colors">
                  <td className="p-3 text-sm font-medium">{auction.title}</td>
                  <td className="p-3"><Badge variant="outline" className="text-[10px]">{auction.auctionType.toUpperCase()}</Badge></td>
                  <td className="p-3">
                    <div className="flex gap-1">{parseJsonArray(auction.categories).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant={auction.status === "open" ? "success" : auction.status === "settled" ? "info" : auction.status === "draft" ? "secondary" : "outline"}>
                      {auction.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-sm tabular-nums">{auction._count.bids}</td>
                  <td className="p-3 text-center text-sm tabular-nums">{auction._count.asks}</td>
                  <td className="p-3 text-sm text-muted-foreground">{format(new Date(auction.endTime), "MMM d HH:mm")}</td>
                  <td className="p-3">
                    <Link href={`/admin/auctions/${auction.id}`}>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {auctions.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No auctions created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
