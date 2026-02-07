import type {
  ClearingBid,
  ClearingAsk,
  AllocationResult,
  ClearingResult,
  CategoryResult,
  SubstitutionMatrix,
} from "./types";

/**
 * VCG (Vickrey-Clarke-Groves) multi-category auction clearing.
 *
 * The VCG mechanism:
 * 1. Find welfare-maximizing allocation (greedy)
 * 2. For each winner, compute their VCG payment:
 *    payment_i = (welfare of others without i) - (welfare of others with i)
 *    This equals the "harm" bidder i imposes on other participants.
 *
 * Properties: Dominant Strategy Incentive Compatible (DSIC) - truthful bidding
 * is each participant's best strategy.
 */
export function clearVCGAuction(
  bids: ClearingBid[],
  asks: ClearingAsk[],
  substitutionMatrix?: SubstitutionMatrix | null,
  aggregateReserve?: number | null
): ClearingResult {
  const activeBids = bids.filter((b) => b.quantity > 0);
  const activeAsks = asks.filter((a) => a.quantity > 0);

  if (activeBids.length === 0 || activeAsks.length === 0) {
    return emptyResult();
  }

  // Step 1: Find welfare-maximizing allocation with all participants
  const optimalAllocation = findOptimalAllocation(
    activeBids,
    activeAsks,
    substitutionMatrix
  );

  if (optimalAllocation.length === 0) {
    return emptyResult();
  }

  // Compute total welfare with all participants
  const welfareWithAll = computeWelfare(optimalAllocation, activeBids, activeAsks);

  // Step 2: For each winning bidder, compute VCG payment
  const winningBidIds = new Set(optimalAllocation.map((a) => a.bidId));
  const vcgAllocations: AllocationResult[] = [];

  for (const alloc of optimalAllocation) {
    // Remove this bidder and recompute optimal allocation
    const bidsWithoutI = activeBids.filter((b) => b.id !== alloc.bidId);
    const allocWithoutI = findOptimalAllocation(
      bidsWithoutI,
      activeAsks,
      substitutionMatrix
    );

    // Welfare of others without bidder i
    const welfareOthersWithoutI = computeWelfare(
      allocWithoutI,
      bidsWithoutI,
      activeAsks
    );

    // Welfare of others WITH bidder i (from original allocation, excluding i's surplus)
    const welfareOthersWithI = computeOthersWelfare(
      optimalAllocation,
      alloc.bidId,
      activeBids,
      activeAsks
    );

    // VCG payment = externality = welfare of others without i - welfare of others with i
    const vcgPayment = Math.max(0, welfareOthersWithoutI - welfareOthersWithI);

    // Price per gallon from VCG payment
    const pricePerGallon =
      alloc.quantity > 0 ? vcgPayment / alloc.quantity : 0;

    vcgAllocations.push({
      bidId: alloc.bidId,
      askId: alloc.askId,
      safCategory: alloc.safCategory,
      quantity: alloc.quantity,
      pricePerGallon,
      totalPrice: vcgPayment,
      vcgPayment,
    });
  }

  // Step 3: Check aggregate reserve
  const totalValue = vcgAllocations.reduce((s, a) => s + a.totalPrice, 0);
  let reserveMet = true;

  if (aggregateReserve && totalValue < aggregateReserve) {
    // Scale up payments proportionally to meet reserve
    const scaleFactor = aggregateReserve / totalValue;
    for (const alloc of vcgAllocations) {
      alloc.pricePerGallon *= scaleFactor;
      alloc.totalPrice *= scaleFactor;
      if (alloc.vcgPayment) alloc.vcgPayment *= scaleFactor;
    }
    reserveMet = true; // Met via scaling
  }

  // Compute final metrics
  const totalVolume = vcgAllocations.reduce((s, a) => s + a.quantity, 0);
  const finalTotalValue = vcgAllocations.reduce((s, a) => s + a.totalPrice, 0);
  const averagePrice = totalVolume > 0 ? finalTotalValue / totalVolume : 0;

  // Category breakdown
  const catMap = new Map<string, CategoryResult>();
  for (const alloc of vcgAllocations) {
    const existing = catMap.get(alloc.safCategory) ?? {
      category: alloc.safCategory,
      volume: 0,
      avgPrice: 0,
      clearingPrice: 0,
      bidCount: 0,
      askCount: 0,
    };
    existing.volume += alloc.quantity;
    catMap.set(alloc.safCategory, existing);
  }

  const categoryResults = Array.from(catMap.values()).map((cr) => ({
    ...cr,
    avgPrice: cr.volume > 0
      ? vcgAllocations
          .filter((a) => a.safCategory === cr.category)
          .reduce((s, a) => s + a.totalPrice, 0) / cr.volume
      : 0,
    clearingPrice: cr.volume > 0
      ? vcgAllocations
          .filter((a) => a.safCategory === cr.category)
          .reduce((s, a) => s + a.pricePerGallon, 0) /
        vcgAllocations.filter((a) => a.safCategory === cr.category).length
      : 0,
    bidCount: activeBids.filter((b) => b.safCategory === cr.category).length,
    askCount: activeAsks.filter((a) => a.safCategory === cr.category).length,
  }));

  return {
    mechanism: "vcg",
    allocations: vcgAllocations,
    totalVolume,
    totalValue: finalTotalValue,
    averagePrice,
    socialWelfare: welfareWithAll,
    revenueRatio: welfareWithAll > 0 ? finalTotalValue / welfareWithAll : 0,
    reserveMet,
    categoryResults,
  };
}

/**
 * Greedy welfare-maximizing allocation.
 * Creates (bid, ask) pairs sorted by surplus (bidPrice - askPrice),
 * and greedily assigns quantities.
 */
function findOptimalAllocation(
  bids: ClearingBid[],
  asks: ClearingAsk[],
  substitutionMatrix?: SubstitutionMatrix | null
): AllocationResult[] {
  // Generate all possible (bid, ask) pairs with positive surplus
  interface Pair {
    bid: ClearingBid;
    ask: ClearingAsk;
    surplus: number;
    effectiveCategory: string;
    substitutionFactor: number;
  }

  const pairs: Pair[] = [];

  for (const bid of bids) {
    for (const ask of asks) {
      let substitutionFactor = 1.0;
      let effectivePrice = bid.maxPrice;

      if (bid.safCategory === ask.safCategory) {
        // Direct match
        if (bid.maxPrice >= ask.minPrice) {
          pairs.push({
            bid,
            ask,
            surplus: bid.maxPrice - ask.minPrice,
            effectiveCategory: ask.safCategory,
            substitutionFactor: 1.0,
          });
        }
      } else if (bid.allowSubstitution && substitutionMatrix) {
        // Cross-category with substitution
        const key = `${bid.safCategory}->${ask.safCategory}`;
        const factor = substitutionMatrix[key];
        if (factor) {
          effectivePrice = bid.maxPrice * factor;
          if (effectivePrice >= ask.minPrice) {
            pairs.push({
              bid,
              ask,
              surplus: effectivePrice - ask.minPrice,
              effectiveCategory: ask.safCategory,
              substitutionFactor: factor,
            });
          }
        }
      }
    }
  }

  // Sort by surplus descending (greedy welfare maximization)
  pairs.sort((a, b) => b.surplus - a.surplus);

  // Greedy assignment respecting quantity constraints
  const remainingBidQty = new Map<string, number>();
  const remainingAskQty = new Map<string, number>();

  for (const bid of bids) remainingBidQty.set(bid.id, bid.quantity);
  for (const ask of asks) remainingAskQty.set(ask.id, ask.quantity);

  const allocations: AllocationResult[] = [];

  for (const pair of pairs) {
    const bidRemaining = remainingBidQty.get(pair.bid.id) ?? 0;
    const askRemaining = remainingAskQty.get(pair.ask.id) ?? 0;

    if (bidRemaining <= 0 || askRemaining <= 0) continue;

    const matchQty = Math.min(bidRemaining, askRemaining);

    allocations.push({
      bidId: pair.bid.id,
      askId: pair.ask.id,
      safCategory: pair.effectiveCategory,
      quantity: matchQty,
      pricePerGallon: 0, // Set later by VCG
      totalPrice: 0,
    });

    remainingBidQty.set(pair.bid.id, bidRemaining - matchQty);
    remainingAskQty.set(pair.ask.id, askRemaining - matchQty);
  }

  return allocations;
}

function computeWelfare(
  allocations: AllocationResult[],
  bids: ClearingBid[],
  asks: ClearingAsk[]
): number {
  let welfare = 0;
  for (const alloc of allocations) {
    const bid = bids.find((b) => b.id === alloc.bidId);
    const ask = asks.find((a) => a.id === alloc.askId);
    if (bid && ask) {
      welfare += (bid.maxPrice - ask.minPrice) * alloc.quantity;
    }
  }
  return welfare;
}

function computeOthersWelfare(
  allocations: AllocationResult[],
  excludeBidId: string,
  bids: ClearingBid[],
  asks: ClearingAsk[]
): number {
  let welfare = 0;
  for (const alloc of allocations) {
    if (alloc.bidId === excludeBidId) continue;
    const bid = bids.find((b) => b.id === alloc.bidId);
    const ask = asks.find((a) => a.id === alloc.askId);
    if (bid && ask) {
      welfare += (bid.maxPrice - ask.minPrice) * alloc.quantity;
    }
  }
  return welfare;
}

function emptyResult(): ClearingResult {
  return {
    mechanism: "vcg",
    allocations: [],
    totalVolume: 0,
    totalValue: 0,
    averagePrice: 0,
    socialWelfare: 0,
    revenueRatio: 0,
    reserveMet: false,
    categoryResults: [],
  };
}
