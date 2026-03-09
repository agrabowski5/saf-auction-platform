import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function recalculateInventoryTotals(inventoryId: string) {
  const entries = await db.emissionEntry.findMany({ where: { inventoryId } });
  const scope1Total = entries
    .filter((e) => e.scope === 1)
    .reduce((s, e) => s + e.tCO2e, 0);
  const scope2Total = entries
    .filter((e) => e.scope === 2)
    .reduce((s, e) => s + e.tCO2e, 0);
  const scope3Total = entries
    .filter((e) => e.scope === 3)
    .reduce((s, e) => s + e.tCO2e, 0);
  await db.emissionsInventory.update({
    where: { id: inventoryId },
    data: { scope1Total, scope2Total, scope3Total },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get("inventoryId");

    if (!inventoryId) {
      return NextResponse.json(
        { error: "inventoryId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify inventory ownership
    const inventory = await db.emissionsInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "admin" && inventory.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entries = await db.emissionEntry.findMany({
      where: { inventoryId },
      orderBy: { createdAt: "desc" },
      include: { sector: true },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/emissions/entries error:", error);
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
    const {
      inventoryId,
      scope,
      ghgCategory,
      sectorCode,
      description,
      activityData,
      activityUnit,
      emissionFactor,
      tCO2e,
      source,
    } = body;

    // Validate required fields
    if (!inventoryId || scope == null || !ghgCategory || !sectorCode || !description || tCO2e == null) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: inventoryId, scope, ghgCategory, sectorCode, description, tCO2e",
        },
        { status: 400 }
      );
    }

    // Verify inventory ownership
    const inventory = await db.emissionsInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "admin" && inventory.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entry = await db.emissionEntry.create({
      data: {
        inventoryId,
        scope,
        ghgCategory,
        sectorCode,
        description,
        activityData: activityData ?? null,
        activityUnit: activityUnit ?? null,
        emissionFactor: emissionFactor ?? null,
        tCO2e,
        source: source ?? null,
      },
    });

    // Recalculate inventory totals
    await recalculateInventoryTotals(inventoryId);

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/emissions/entries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
