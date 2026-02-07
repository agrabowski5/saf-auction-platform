import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuctionSchema } from "@/lib/validations/auction";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const auctions = await db.auction.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bids: true, asks: true } },
    },
  });

  return NextResponse.json(auctions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const validated = createAuctionSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const { categories, substitutionMatrix, ...rest } = validated.data;

  const auction = await db.auction.create({
    data: {
      ...rest,
      categories: JSON.stringify(categories),
      substitutionMatrix: substitutionMatrix ? JSON.stringify(substitutionMatrix) : null,
    },
  });

  return NextResponse.json(auction, { status: 201 });
}
