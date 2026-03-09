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
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};

    // Non-admin users can only see their own inventories
    if (session.user.role !== "admin") {
      where.userId = session.user.id;
    }

    if (year) {
      where.year = parseInt(year, 10);
    }

    const inventories = await db.emissionsInventory.findMany({
      where,
      orderBy: { year: "desc" },
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json(inventories);
  } catch (error) {
    console.error("GET /api/emissions/inventories error:", error);
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

    const body = await req.json();
    const { year } = body;

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "Invalid input: year is required and must be a number" },
        { status: 400 }
      );
    }

    const inventory = await db.emissionsInventory.create({
      data: {
        userId: session.user.id,
        year,
        status: "draft",
        scope1Total: 0,
        scope2Total: 0,
        scope3Total: 0,
      },
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    console.error("POST /api/emissions/inventories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
