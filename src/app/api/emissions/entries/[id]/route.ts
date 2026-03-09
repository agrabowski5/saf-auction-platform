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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the entry and verify ownership via inventory
    const entry = await db.emissionEntry.findUnique({
      where: { id },
      include: { inventory: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (
      session.user.role !== "admin" &&
      entry.inventory.userId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
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

    const updateData: Record<string, unknown> = {};
    if (scope !== undefined) updateData.scope = scope;
    if (ghgCategory !== undefined) updateData.ghgCategory = ghgCategory;
    if (sectorCode !== undefined) updateData.sectorCode = sectorCode;
    if (description !== undefined) updateData.description = description;
    if (activityData !== undefined) updateData.activityData = activityData;
    if (activityUnit !== undefined) updateData.activityUnit = activityUnit;
    if (emissionFactor !== undefined) updateData.emissionFactor = emissionFactor;
    if (tCO2e !== undefined) updateData.tCO2e = tCO2e;
    if (source !== undefined) updateData.source = source;

    const updated = await db.emissionEntry.update({
      where: { id },
      data: updateData,
    });

    // Recalculate inventory totals
    await recalculateInventoryTotals(entry.inventoryId);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/emissions/entries/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the entry and verify ownership via inventory
    const entry = await db.emissionEntry.findUnique({
      where: { id },
      include: { inventory: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (
      session.user.role !== "admin" &&
      entry.inventory.userId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inventoryId = entry.inventoryId;

    await db.emissionEntry.delete({ where: { id } });

    // Recalculate inventory totals
    await recalculateInventoryTotals(inventoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/emissions/entries/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
