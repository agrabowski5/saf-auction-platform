import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { auctionId } = body;

  if (!auctionId) {
    return NextResponse.json(
      { error: "auctionId is required" },
      { status: 400 }
    );
  }

  const pool = await db.demandPool.findUnique({ where: { id } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  if (pool.status !== "active") {
    return NextResponse.json(
      { error: "Pool must be active to link to an auction" },
      { status: 400 }
    );
  }

  // Validate the auction exists
  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) {
    return NextResponse.json(
      { error: "Auction not found" },
      { status: 404 }
    );
  }

  const updated = await db.demandPool.update({
    where: { id },
    data: {
      auctionId,
      status: "clearing",
    },
    include: {
      sector: true,
      abatementType: true,
      auction: true,
      participants: {
        include: {
          user: {
            select: { id: true, name: true, company: true },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  return NextResponse.json(updated);
}
