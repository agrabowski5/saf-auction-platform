import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseJsonArray } from "@/lib/utils";
import Link from "next/link";
import { Clock, Gavel } from "lucide-react";
import { format } from "date-fns";

export default async function AuctionsPage() {
  const auctions = await db.auction.findMany({
    where: { status: { in: ["open", "closed", "settled"] } },
    orderBy: { startTime: "desc" },
    include: {
      _count: { select: { bids: true, asks: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Active Auctions</h1>
        <p className="text-sm text-muted-foreground">Browse and participate in SAF auctions</p>
      </div>

      {auctions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gavel className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No auctions available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction) => {
            const categories = parseJsonArray(auction.categories);
            const isOpen = auction.status === "open";
            const endDate = new Date(auction.endTime);
            const now = new Date();
            const hoursLeft = Math.max(0, (endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

            return (
              <Link key={auction.id} href={`/auctions/${auction.id}`}>
                <Card className="h-full transition-colors hover:bg-accent/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{auction.title}</CardTitle>
                      <Badge variant={isOpen ? "success" : auction.status === "settled" ? "info" : "secondary"}>
                        {auction.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{auction.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px]">{auction.auctionType.toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isOpen ? `${hoursLeft.toFixed(0)}h left` : format(endDate, "MMM d, yyyy")}
                      </span>
                      <span>{auction._count.bids} bids &bull; {auction._count.asks} asks</span>
                    </div>
                    {auction.reservePricePerGal && (
                      <p className="text-xs text-muted-foreground">
                        Reserve: ${auction.reservePricePerGal.toFixed(2)}/gal
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
