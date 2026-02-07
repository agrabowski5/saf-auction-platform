import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bidSchema } from "@/lib/validations/bid";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only admin can see all bids (sealed bid confidentiality)
  if (session.user.role === "admin") {
    const bids = await db.bid.findMany({
      where: { auctionId: id },
      include: { bidder: { select: { name: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bids);
  }

  // Consumers can only see their own bids
  const bids = await db.bid.findMany({
    where: { auctionId: id, bidderId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bids);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "consumer") {
    return NextResponse.json({ error: "Consumers only" }, { status: 403 });
  }

  const { id } = await params;

  // Check auction is open
  const auction = await db.auction.findUnique({ where: { id } });
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }
  if (auction.status !== "open") {
    return NextResponse.json({ error: "Auction is not open for bidding" }, { status: 400 });
  }

  const body = await req.json();
  const validated = bidSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid bid", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const { categoryPreferences, ...bidData } = validated.data;

  const bid = await db.bid.create({
    data: {
      ...bidData,
      auctionId: id,
      bidderId: session.user.id,
      categoryPreferences: categoryPreferences ? JSON.stringify(categoryPreferences) : null,
    },
  });

  return NextResponse.json(bid, { status: 201 });
}
