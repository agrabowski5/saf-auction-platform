import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all active targets for the user
    const targets = await db.abatementTarget.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { sectorCode: "asc" }],
      include: {
        sector: true,
      },
    });

    // Get the latest inventory to pull emission data by sector
    const latestInventory = await db.emissionsInventory.findFirst({
      where: { userId },
      orderBy: { year: "desc" },
      include: {
        entries: true,
      },
    });

    // Build sector emissions map from the latest inventory
    const sectorEmissions = new Map<string, number>();
    if (latestInventory) {
      for (const entry of latestInventory.entries) {
        const current = sectorEmissions.get(entry.sectorCode) ?? 0;
        sectorEmissions.set(entry.sectorCode, current + entry.tCO2e);
      }
    }

    // Build progress for each target
    const progress = targets.map((target) => {
      const currentEmissions = sectorEmissions.get(target.sectorCode) ?? 0;
      const progressPercent =
        target.targetReduction > 0
          ? Math.min(
              (target.currentReduction / target.targetReduction) * 100,
              100
            )
          : 0;

      return {
        targetId: target.id,
        sectorCode: target.sectorCode,
        sectorName: target.sector.name,
        sectorColor: target.sector.color,
        year: target.year,
        targetReduction: target.targetReduction,
        currentReduction: target.currentReduction,
        remainingReduction: Math.max(
          target.targetReduction - target.currentReduction,
          0
        ),
        progressPercent,
        status: target.status,
        currentEmissions,
      };
    });

    // Summary across all targets
    const totalTargetReduction = targets.reduce(
      (sum, t) => sum + t.targetReduction,
      0
    );
    const totalCurrentReduction = targets.reduce(
      (sum, t) => sum + t.currentReduction,
      0
    );
    const overallProgress =
      totalTargetReduction > 0
        ? Math.min((totalCurrentReduction / totalTargetReduction) * 100, 100)
        : 0;

    return NextResponse.json({
      summary: {
        totalTargets: targets.length,
        totalTargetReduction,
        totalCurrentReduction,
        totalRemainingReduction: Math.max(
          totalTargetReduction - totalCurrentReduction,
          0
        ),
        overallProgress,
        inventoryYear: latestInventory?.year ?? null,
      },
      progress,
    });
  } catch (error) {
    console.error("GET /api/targets/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
