import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseJsonArray, parseJsonObject, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { Clock, TrendingUp, TrendingDown, Gavel } from "lucide-react";
import { SAF_CATEGORIES, type SAFCategoryCode } from "@/lib/constants/saf-categories";

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role;

  const auction = await db.auction.findUnique({
    where: { id },
    include: {
      _count: { select: { bids: true, asks: true } },
      auctionResults: { take: 1, orderBy: { clearedAt: "desc" } },
    },
  });

  if (!auction) notFound();

  const categories = parseJsonArray(auction.categories);
  const isOpen = auction.status === "open";
  const endDate = new Date(auction.endTime);
  const result = auction.auctionResults[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{auction.title}</h1>
            <Badge variant={isOpen ? "success" : auction.status === "settled" ? "info" : "secondary"}>
              {auction.status}
            </Badge>
          </div>
          {auction.description && (
            <p className="mt-1 text-sm text-muted-foreground">{auction.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {role === "consumer" && isOpen && (
            <Link href={`/consumer/bids/${auction.id}`}>
              <Button><TrendingUp className="mr-2 h-4 w-4" />Submit Bid</Button>
            </Link>
          )}
          {role === "producer" && isOpen && (
            <Link href={`/producer/asks/${auction.id}`}>
              <Button variant="outline"><TrendingDown className="mr-2 h-4 w-4" />Submit Ask</Button>
            </Link>
          )}
          {role === "admin" && auction.status === "closed" && (
            <Link href={`/admin/auctions/${auction.id}`}>
              <Button><Gavel className="mr-2 h-4 w-4" />Clear Auction</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Timing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Start: {format(new Date(auction.startTime), "MMM d, yyyy HH:mm")}</p>
            <p className="text-sm">End: {format(endDate, "MMM d, yyyy HH:mm")}</p>
            {isOpen && (
              <p className="mt-2 text-xs font-medium text-primary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Auction is live
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mechanism</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{auction.auctionType === "vcg" ? "VCG (Multi-Category)" : "Vickrey (Second Price)"}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {categories.map((cat) => {
                const info = SAF_CATEGORIES[cat as SAFCategoryCode];
                return (
                  <Badge key={cat} variant="outline" className="text-[10px]" style={{ borderColor: info?.color }}>
                    {info?.shortName ?? cat}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{auction._count.bids} bids submitted</p>
            <p className="text-sm">{auction._count.asks} asks submitted</p>
            {auction.reservePricePerGal && (
              <p className="mt-2 text-xs text-muted-foreground">Reserve: {formatCurrency(auction.reservePricePerGal)}/gal</p>
            )}
            {auction.aggregateReserve && (
              <p className="text-xs text-muted-foreground">Aggregate reserve: {formatCurrency(auction.aggregateReserve)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Auction Results</CardTitle>
            <CardDescription>Cleared on {format(new Date(result.clearedAt), "MMM d, yyyy HH:mm")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-xl font-bold tabular-nums">{result.totalVolume.toLocaleString()} gal</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(result.totalValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Price</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(result.averagePrice)}/gal</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
