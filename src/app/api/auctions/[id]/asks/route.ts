import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { askSchema } from "@/lib/validations/ask";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.role === "admin") {
    const asks = await db.ask.findMany({
      where: { auctionId: id },
      include: {
        producer: { select: { name: true, company: true } },
        facility: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(asks);
  }

  const asks = await db.ask.findMany({
    where: { auctionId: id, producerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(asks);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "producer") {
    return NextResponse.json({ error: "Producers only" }, { status: 403 });
  }

  const { id } = await params;

  const auction = await db.auction.findUnique({ where: { id } });
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }
  if (auction.status !== "open") {
    return NextResponse.json({ error: "Auction is not open" }, { status: 400 });
  }

  const body = await req.json();
  const validated = askSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid ask", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const { categoryOffers, ...askData } = validated.data;

  const ask = await db.ask.create({
    data: {
      ...askData,
      auctionId: id,
      producerId: session.user.id,
      categoryOffers: categoryOffers ? JSON.stringify(categoryOffers) : null,
    },
  });

  return NextResponse.json(ask, { status: 201 });
}
