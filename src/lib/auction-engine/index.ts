import { db } from "@/lib/db";
import { clearVickreyAuction } from "./vickrey";
import { clearVCGAuction } from "./vcg";
import { parseJsonObject } from "@/lib/utils";
import type { ClearingBid, ClearingAsk, ClearingResult, SubstitutionMatrix } from "./types";

/**
 * Main auction clearing orchestrator.
 * Fetches bids/asks from DB, runs appropriate mechanism, stores results.
 */
export async function clearAuction(auctionId: string): Promise<ClearingResult> {
  const auction = await db.auction.findUnique({
    where: { id: auctionId },
    include: {
      bids: { where: { status: "active" } },
      asks: { where: { status: "active" } },
    },
  });

  if (!auction) throw new Error("Auction not found");
  if (auction.status !== "closed") {
    throw new Error("Auction must be closed before clearing");
  }

  // Convert DB bids to clearing format
  const clearingBids: ClearingBid[] = auction.bids.map((bid) => ({
    id: bid.id,
    bidderId: bid.bidderId,
    safCategory: bid.safCategory,
    quantity: bid.quantity,
    maxPrice: bid.maxPrice,
    allowSubstitution: bid.allowSubstitution,
    categoryPreferences: bid.categoryPreferences
      ? JSON.parse(bid.categoryPreferences)
      : undefined,
  }));

  const clearingAsks: ClearingAsk[] = auction.asks.map((ask) => ({
    id: ask.id,
    producerId: ask.producerId,
    safCategory: ask.safCategory,
    quantity: ask.quantity,
    minPrice: ask.minPrice,
    facilityId: ask.facilityId,
  }));

  // Run appropriate mechanism
  let result: ClearingResult;

  if (auction.auctionType === "vcg") {
    const substitutionMatrix = parseJsonObject<SubstitutionMatrix>(
      auction.substitutionMatrix
    );
    result = clearVCGAuction(
      clearingBids,
      clearingAsks,
      substitutionMatrix,
      auction.aggregateReserve
    );
  } else {
    result = clearVickreyAuction(
      clearingBids,
      clearingAsks,
      auction.reservePricePerGal
    );
  }

  // Store results in database atomically
  await db.$transaction(async (tx) => {
    // Create auction result
    const auctionResult = await tx.auctionResult.create({
      data: {
        auctionId,
        mechanism: result.mechanism,
        totalVolume: result.totalVolume,
        totalValue: result.totalValue,
        averagePrice: result.averagePrice,
        categoryResults: JSON.stringify(result.categoryResults),
        socialWelfare: result.socialWelfare,
        revenueRatio: result.revenueRatio,
        reserveMet: result.reserveMet,
      },
    });

    // Create allocations
    for (const alloc of result.allocations) {
      await tx.allocation.create({
        data: {
          auctionResultId: auctionResult.id,
          auctionId,
          bidId: alloc.bidId,
          askId: alloc.askId,
          safCategory: alloc.safCategory,
          quantity: alloc.quantity,
          pricePerGallon: alloc.pricePerGallon,
          totalPrice: alloc.totalPrice,
          vcgPayment: alloc.vcgPayment,
        },
      });
    }

    // Update winning bids
    const winningBidIds = [...new Set(result.allocations.map((a) => a.bidId))];
    const losingBidIds = auction.bids
      .filter((b) => !winningBidIds.includes(b.id))
      .map((b) => b.id);

    for (const bidId of winningBidIds) {
      const bidAllocs = result.allocations.filter((a) => a.bidId === bidId);
      const totalQty = bidAllocs.reduce((s, a) => s + a.quantity, 0);
      const avgPrice =
        totalQty > 0
          ? bidAllocs.reduce((s, a) => s + a.totalPrice, 0) / totalQty
          : 0;

      await tx.bid.update({
        where: { id: bidId },
        data: {
          status: "won",
          clearedPrice: avgPrice,
          clearedQuantity: totalQty,
          isSealed: false,
        },
      });
    }

    for (const bidId of losingBidIds) {
      await tx.bid.update({
        where: { id: bidId },
        data: { status: "lost", isSealed: false },
      });
    }

    // Update winning asks
    const winningAskIds = [...new Set(result.allocations.map((a) => a.askId))];
    const losingAskIds = auction.asks
      .filter((a) => !winningAskIds.includes(a.id))
      .map((a) => a.id);

    for (const askId of winningAskIds) {
      const askAllocs = result.allocations.filter((a) => a.askId === askId);
      const totalQty = askAllocs.reduce((s, a) => s + a.quantity, 0);
      const avgPrice =
        totalQty > 0
          ? askAllocs.reduce((s, a) => s + a.totalPrice, 0) / totalQty
          : 0;

      await tx.ask.update({
        where: { id: askId },
        data: {
          status: "won",
          clearedPrice: avgPrice,
          clearedQuantity: totalQty,
          isSealed: false,
        },
      });
    }

    for (const askId of losingAskIds) {
      await tx.ask.update({
        where: { id: askId },
        data: { status: "lost", isSealed: false },
      });
    }

    // Update auction status
    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "settled" },
    });
  });

  return result;
}
