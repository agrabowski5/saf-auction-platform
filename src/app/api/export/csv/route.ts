import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "auctions";

  let data: Record<string, unknown>[] = [];

  if (type === "auctions") {
    const auctions = await db.auction.findMany({
      include: { _count: { select: { bids: true, asks: true } } },
    });
    data = auctions.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      type: a.auctionType,
      categories: a.categories,
      startTime: a.startTime,
      endTime: a.endTime,
      reservePrice: a.reservePricePerGal,
      bids: a._count.bids,
      asks: a._count.asks,
    }));
  } else if (type === "bids") {
    const bids = await db.bid.findMany({
      where: session.user.role === "admin" ? {} : { bidderId: session.user.id },
      include: { auction: { select: { title: true } } },
    });
    data = bids.map((b) => ({
      auction: b.auction.title,
      category: b.safCategory,
      quantity: b.quantity,
      maxPrice: b.maxPrice,
      clearedPrice: b.clearedPrice,
      status: b.status,
      date: b.createdAt,
    }));
  } else if (type === "allocations") {
    const where =
      session.user.role === "admin"
        ? {}
        : session.user.role === "consumer"
        ? { bid: { bidderId: session.user.id } }
        : { ask: { producerId: session.user.id } };

    const allocations = await db.allocation.findMany({
      where,
      include: { auction: { select: { title: true } } },
    });
    data = allocations.map((a) => ({
      auction: a.auction.title,
      category: a.safCategory,
      quantity: a.quantity,
      pricePerGallon: a.pricePerGallon,
      totalPrice: a.totalPrice,
      vcgPayment: a.vcgPayment,
      status: a.status,
    }));
  }

  const csv = Papa.unparse(data);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-export-${Date.now()}.csv"`,
    },
  });
}
