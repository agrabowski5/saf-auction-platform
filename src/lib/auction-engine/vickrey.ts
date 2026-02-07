import type {
  ClearingBid,
  ClearingAsk,
  AllocationResult,
  ClearingResult,
  CategoryResult,
} from "./types";

/**
 * Single-category Vickrey (second-price) auction clearing.
 *
 * In a multi-unit Vickrey auction:
 * - Bids sorted descending by maxPrice
 * - Asks sorted ascending by minPrice
 * - Clearing occurs where supply meets demand
 * - Each winning bidder pays the highest losing bid price (uniform second-price)
 *   OR in discriminatory variant, each unit pays the next-highest rejected bid.
 *
 * We implement the uniform second-price variant:
 * - Clearing price = the first rejected bid's price (or the marginal ask price)
 * - All winners pay this single clearing price
 * - Sellers receive the clearing price
 */
export function clearVickreyAuction(
  bids: ClearingBid[],
  asks: ClearingAsk[],
  reservePricePerGal?: number | null
): ClearingResult {
  // Filter active only
  const activeBids = [...bids].filter((b) => b.quantity > 0);
  const activeAsks = [...asks].filter((a) => a.quantity > 0);

  // Sort bids descending by price, asks ascending
  activeBids.sort((a, b) => b.maxPrice - a.maxPrice);
  activeAsks.sort((a, b) => a.minPrice - b.minPrice);

  if (activeBids.length === 0 || activeAsks.length === 0) {
    return emptyResult("vickrey");
  }

  // Build cumulative supply and demand
  let demandCumulative = 0;
  let supplyCumulative = 0;

  // Find clearing quantity: walk bids and asks together
  const allocations: AllocationResult[] = [];
  let bidIdx = 0;
  let askIdx = 0;
  let remainingBidQty = activeBids[0]?.quantity ?? 0;
  let remainingAskQty = activeAsks[0]?.quantity ?? 0;
  let clearingPrice = 0;

  while (bidIdx < activeBids.length && askIdx < activeAsks.length) {
    const bid = activeBids[bidIdx];
    const ask = activeAsks[askIdx];

    // If bid price < ask price, no more trades possible
    if (bid.maxPrice < ask.minPrice) break;

    // Reserve price check
    if (reservePricePerGal && bid.maxPrice < reservePricePerGal) break;
    if (reservePricePerGal && ask.minPrice > reservePricePerGal) break;

    // Match quantity
    const matchQty = Math.min(remainingBidQty, remainingAskQty);

    allocations.push({
      bidId: bid.id,
      askId: ask.id,
      safCategory: ask.safCategory,
      quantity: matchQty,
      pricePerGallon: 0, // Will be set after determining clearing price
      totalPrice: 0,
    });

    remainingBidQty -= matchQty;
    remainingAskQty -= matchQty;

    if (remainingBidQty <= 0) {
      bidIdx++;
      remainingBidQty = activeBids[bidIdx]?.quantity ?? 0;
    }
    if (remainingAskQty <= 0) {
      askIdx++;
      remainingAskQty = activeAsks[askIdx]?.quantity ?? 0;
    }
  }

  if (allocations.length === 0) {
    return emptyResult("vickrey");
  }

  // Determine Vickrey (second-price) clearing price:
  // The price is the highest rejected bid price, or if all bids win,
  // the lowest winning bid price.
  if (bidIdx < activeBids.length && activeBids[bidIdx]) {
    // There are rejected bids - clearing price is the highest rejected bid
    clearingPrice = activeBids[bidIdx].maxPrice;
  } else {
    // All bids won - clearing price is the lowest winning bid
    const lastAlloc = allocations[allocations.length - 1];
    const lastBid = activeBids.find((b) => b.id === lastAlloc.bidId);
    clearingPrice = lastBid?.maxPrice ?? 0;
  }

  // Ensure clearing price is at least the reserve
  if (reservePricePerGal && clearingPrice < reservePricePerGal) {
    clearingPrice = reservePricePerGal;
  }

  // Apply clearing price to all allocations
  for (const alloc of allocations) {
    alloc.pricePerGallon = clearingPrice;
    alloc.totalPrice = alloc.quantity * clearingPrice;
  }

  // Compute metrics
  const totalVolume = allocations.reduce((s, a) => s + a.quantity, 0);
  const totalValue = allocations.reduce((s, a) => s + a.totalPrice, 0);
  const averagePrice = totalVolume > 0 ? totalValue / totalVolume : 0;

  // Social welfare = sum of (buyer valuation - seller cost) for each match
  let socialWelfare = 0;
  for (const alloc of allocations) {
    const bid = activeBids.find((b) => b.id === alloc.bidId);
    const ask = activeAsks.find((a) => a.id === alloc.askId);
    if (bid && ask) {
      socialWelfare += (bid.maxPrice - ask.minPrice) * alloc.quantity;
    }
  }

  // Max possible welfare (if we could match everything optimally)
  const maxWelfare = socialWelfare; // In Vickrey, the allocation IS optimal
  const revenueRatio = maxWelfare > 0 ? totalValue / (maxWelfare + totalValue) : 0;

  // Category results
  const catMap = new Map<string, CategoryResult>();
  for (const alloc of allocations) {
    const existing = catMap.get(alloc.safCategory) ?? {
      category: alloc.safCategory,
      volume: 0,
      avgPrice: 0,
      clearingPrice,
      bidCount: 0,
      askCount: 0,
    };
    existing.volume += alloc.quantity;
    catMap.set(alloc.safCategory, existing);
  }

  const categoryResults = Array.from(catMap.values()).map((cr) => ({
    ...cr,
    avgPrice: clearingPrice,
    bidCount: activeBids.filter((b) => b.safCategory === cr.category).length,
    askCount: activeAsks.filter((a) => a.safCategory === cr.category).length,
  }));

  return {
    mechanism: "vickrey",
    allocations,
    totalVolume,
    totalValue,
    averagePrice,
    socialWelfare,
    revenueRatio,
    reserveMet: !reservePricePerGal || clearingPrice >= reservePricePerGal,
    categoryResults,
  };
}

function emptyResult(mechanism: "vickrey" | "vcg"): ClearingResult {
  return {
    mechanism,
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
