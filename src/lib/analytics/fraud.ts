import { db } from "@/lib/db";

export interface FraudAlert {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  entityId: string;
  entityType: string;
  details: Record<string, unknown>;
}

export async function detectFraudPatterns(): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = [];

  const bids = await db.bid.findMany({
    include: { auction: true, bidder: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  // 1. Bid sniping: bids placed in last 5 minutes of auction
  for (const bid of bids) {
    const auctionEnd = new Date(bid.auction.endTime).getTime();
    const bidTime = new Date(bid.createdAt).getTime();
    const minutesBefore = (auctionEnd - bidTime) / (1000 * 60);

    if (minutesBefore >= 0 && minutesBefore <= 5) {
      alerts.push({
        type: "bid_sniping",
        severity: "medium",
        description: `Bid placed ${minutesBefore.toFixed(1)} minutes before auction close`,
        entityId: bid.id,
        entityType: "bid",
        details: { bidderId: bid.bidderId, auctionId: bid.auctionId, minutesBefore },
      });
    }
  }

  // 2. Unusual quantity patterns: same bidder always bids exact same quantity
  const bidderQuantities = new Map<string, number[]>();
  for (const bid of bids) {
    const existing = bidderQuantities.get(bid.bidderId) ?? [];
    existing.push(bid.quantity);
    bidderQuantities.set(bid.bidderId, existing);
  }

  for (const [bidderId, quantities] of bidderQuantities) {
    if (quantities.length >= 3) {
      const allSame = quantities.every((q) => q === quantities[0]);
      if (allSame) {
        alerts.push({
          type: "repetitive_quantity",
          severity: "low",
          description: `Bidder consistently bids ${quantities[0].toLocaleString()} gallons across ${quantities.length} auctions`,
          entityId: bidderId,
          entityType: "user",
          details: { quantity: quantities[0], count: quantities.length },
        });
      }
    }
  }

  // 3. Price manipulation: bid then withdraw pattern
  const withdrawnBids = bids.filter((b) => b.status === "withdrawn");
  const bidderWithdrawals = new Map<string, number>();
  for (const bid of withdrawnBids) {
    bidderWithdrawals.set(bid.bidderId, (bidderWithdrawals.get(bid.bidderId) ?? 0) + 1);
  }

  for (const [bidderId, count] of bidderWithdrawals) {
    if (count >= 3) {
      alerts.push({
        type: "frequent_withdrawal",
        severity: "high",
        description: `Bidder has withdrawn ${count} bids - possible price manipulation`,
        entityId: bidderId,
        entityType: "user",
        details: { withdrawalCount: count },
      });
    }
  }

  return alerts.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 };
    return sev[b.severity] - sev[a.severity];
  });
}
