import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const inventory = await db.emissionsInventory.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: "desc" },
          include: { sector: true },
        },
      },
    });

    if (!inventory) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify ownership unless admin
    if (session.user.role !== "admin" && inventory.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("GET /api/emissions/inventories/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

    const inventory = await db.emissionsInventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify ownership unless admin
    if (session.user.role !== "admin" && inventory.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    // Recalculate totals from entries
    const entries = await db.emissionEntry.findMany({
      where: { inventoryId: id },
    });

    const scope1Total = entries
      .filter((e) => e.scope === 1)
      .reduce((sum, e) => sum + e.tCO2e, 0);
    const scope2Total = entries
      .filter((e) => e.scope === 2)
      .reduce((sum, e) => sum + e.tCO2e, 0);
    const scope3Total = entries
      .filter((e) => e.scope === 3)
      .reduce((sum, e) => sum + e.tCO2e, 0);

    const updateData: Record<string, unknown> = {
      scope1Total,
      scope2Total,
      scope3Total,
    };

    if (status) {
      updateData.status = status;
    }

    const updated = await db.emissionsInventory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/emissions/inventories/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
