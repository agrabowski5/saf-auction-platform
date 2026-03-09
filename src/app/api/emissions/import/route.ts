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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { inventoryId, entries } = body;

    if (!inventoryId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        {
          error:
            "Invalid input: inventoryId and a non-empty entries array are required",
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

    // Validate each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (
        entry.scope == null ||
        !entry.ghgCategory ||
        !entry.sectorCode ||
        !entry.description ||
        entry.tCO2e == null
      ) {
        return NextResponse.json(
          {
            error: `Entry at index ${i} is missing required fields: scope, ghgCategory, sectorCode, description, tCO2e`,
          },
          { status: 400 }
        );
      }
    }

    // Bulk create all entries
    const created = await db.emissionEntry.createMany({
      data: entries.map(
        (entry: {
          scope: number;
          ghgCategory: string;
          sectorCode: string;
          description: string;
          tCO2e: number;
          source?: string;
        }) => ({
          inventoryId,
          scope: entry.scope,
          ghgCategory: entry.ghgCategory,
          sectorCode: entry.sectorCode,
          description: entry.description,
          tCO2e: entry.tCO2e,
          source: entry.source ?? null,
        })
      ),
    });

    // Recalculate inventory totals
    await recalculateInventoryTotals(inventoryId);

    return NextResponse.json(
      { imported: created.count },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/emissions/import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
