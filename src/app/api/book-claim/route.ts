import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const sectorCode = searchParams.get("sectorCode");

    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === "consumer") {
      where.buyerId = session.user.id;
    } else if (session.user.role === "producer") {
      where.sellerId = session.user.id;
    }
    // admin: no filter, return all

    // Optional filters
    if (status) {
      where.status = status;
    }
    if (sectorCode) {
      where.sectorCode = sectorCode;
    }

    const transactions = await db.bookClaimTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: true,
        seller: true,
        abatementType: true,
        sector: true,
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/book-claim error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "producer") {
      return NextResponse.json(
        { error: "Only producers can create Book & Claim transactions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { abatementTypeCode, sectorCode, quantity, pricePerUnit } = body;

    if (!abatementTypeCode || !sectorCode || quantity == null || pricePerUnit == null) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: abatementTypeCode, sectorCode, quantity, pricePerUnit",
        },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

    if (typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
      return NextResponse.json(
        { error: "pricePerUnit must be a positive number" },
        { status: 400 }
      );
    }

    // Validate abatement type exists
    const abatementType = await db.abatementType.findUnique({
      where: { code: abatementTypeCode },
    });
    if (!abatementType) {
      return NextResponse.json(
        { error: "Invalid abatementTypeCode" },
        { status: 400 }
      );
    }

    // Validate sector exists
    const sector = await db.sector.findUnique({
      where: { code: sectorCode },
    });
    if (!sector) {
      return NextResponse.json(
        { error: "Invalid sectorCode" },
        { status: 400 }
      );
    }

    const totalPrice = quantity * pricePerUnit;

    const transaction = await db.bookClaimTransaction.create({
      data: {
        sellerId: session.user.id,
        abatementTypeCode,
        sectorCode,
        quantity,
        pricePerUnit,
        totalPrice,
        status: "registered",
      },
      include: {
        seller: true,
        abatementType: true,
        sector: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("POST /api/book-claim error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
