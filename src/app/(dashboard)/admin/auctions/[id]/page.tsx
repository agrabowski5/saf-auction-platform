import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseJsonArray, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ClearAuctionButton } from "@/components/auctions/clear-auction-button";
import { UpdateStatusButton } from "@/components/auctions/update-status-button";

export const dynamic = 'force-dynamic';

export default async function AdminAuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auction = await db.auction.findUnique({
    where: { id },
    include: {
      bids: { include: { bidder: { select: { name: true, company: true } } }, orderBy: { createdAt: "desc" } },
      asks: { include: { producer: { select: { name: true, company: true } }, facility: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      auctionResults: { include: { allocations: true }, orderBy: { clearedAt: "desc" }, take: 1 },
    },
  });

  if (!auction) notFound();

  const categories = parseJsonArray(auction.categories);
  const result = auction.auctionResults[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{auction.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={auction.status === "open" ? "success" : auction.status === "settled" ? "info" : "secondary"}>
              {auction.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{auction.auctionType.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {auction.status === "draft" && <UpdateStatusButton auctionId={auction.id} newStatus="open" label="Open Auction" />}
          {auction.status === "open" && <UpdateStatusButton auctionId={auction.id} newStatus="closed" label="Close Bidding" />}
          {auction.status === "closed" && <ClearAuctionButton auctionId={auction.id} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Bids ({auction.bids.length})</CardTitle></CardHeader>
          <CardContent>
            {auction.bids.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bids yet</p>
            ) : (
              <div className="space-y-2">
                {auction.bids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div>
                      <p className="font-medium">{bid.bidder.company || bid.bidder.name}</p>
                      <p className="text-xs text-muted-foreground">{bid.safCategory} &bull; {bid.quantity.toLocaleString()} gal</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums font-medium">{formatCurrency(bid.maxPrice)}/gal</p>
                      <Badge variant={bid.status === "won" ? "success" : bid.status === "active" ? "outline" : "secondary"} className="text-[10px]">{bid.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Asks ({auction.asks.length})</CardTitle></CardHeader>
          <CardContent>
            {auction.asks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No asks yet</p>
            ) : (
              <div className="space-y-2">
                {auction.asks.map((ask) => (
                  <div key={ask.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div>
                      <p className="font-medium">{ask.producer.company || ask.producer.name}</p>
                      <p className="text-xs text-muted-foreground">{ask.safCategory} &bull; {ask.quantity.toLocaleString()} gal</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums font-medium">{formatCurrency(ask.minPrice)}/gal</p>
                      <Badge variant={ask.status === "won" ? "success" : ask.status === "active" ? "outline" : "secondary"} className="text-[10px]">{ask.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Clearing Results</CardTitle>
            <CardDescription>Cleared {format(new Date(result.clearedAt), "MMM d, yyyy HH:mm")} via {result.mechanism.toUpperCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4 mb-4">
              <div><p className="text-xs text-muted-foreground">Volume</p><p className="text-lg font-bold tabular-nums">{result.totalVolume.toLocaleString()} gal</p></div>
              <div><p className="text-xs text-muted-foreground">Value</p><p className="text-lg font-bold tabular-nums">{formatCurrency(result.totalValue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Avg Price</p><p className="text-lg font-bold tabular-nums">{formatCurrency(result.averagePrice)}/gal</p></div>
              <div><p className="text-xs text-muted-foreground">Reserve Met</p><p className="text-lg font-bold">{result.reserveMet ? "Yes" : "No"}</p></div>
            </div>
            {result.allocations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Allocations</h4>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-left">Category</th><th className="p-2 text-right">Quantity</th><th className="p-2 text-right">Price/gal</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">VCG Payment</th></tr></thead>
                  <tbody>
                    {result.allocations.map((alloc) => (
                      <tr key={alloc.id} className="border-b"><td className="p-2">{alloc.safCategory}</td><td className="p-2 text-right tabular-nums">{alloc.quantity.toLocaleString()}</td><td className="p-2 text-right tabular-nums">{formatCurrency(alloc.pricePerGallon)}</td><td className="p-2 text-right tabular-nums">{formatCurrency(alloc.totalPrice)}</td><td className="p-2 text-right tabular-nums">{alloc.vcgPayment ? formatCurrency(alloc.vcgPayment) : "-"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
