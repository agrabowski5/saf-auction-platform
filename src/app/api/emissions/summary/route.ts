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

    // Get all inventories for the user, ordered by year descending
    const inventories = await db.emissionsInventory.findMany({
      where: { userId },
      orderBy: { year: "desc" },
      include: {
        entries: true,
      },
    });

    if (inventories.length === 0) {
      return NextResponse.json({
        latestInventory: null,
        scopeBreakdown: { scope1: 0, scope2: 0, scope3: 0, total: 0 },
        sectorBreakdown: [],
        yearOverYearChange: null,
      });
    }

    // Latest inventory totals
    const latest = inventories[0];
    const latestTotal =
      latest.scope1Total + latest.scope2Total + latest.scope3Total;

    // Scope breakdown from the latest inventory
    const scopeBreakdown = {
      scope1: latest.scope1Total,
      scope2: latest.scope2Total,
      scope3: latest.scope3Total,
      total: latestTotal,
    };

    // Sector breakdown: group entries from latest inventory by sectorCode
    const sectorMap = new Map<string, number>();
    for (const entry of latest.entries) {
      const current = sectorMap.get(entry.sectorCode) ?? 0;
      sectorMap.set(entry.sectorCode, current + entry.tCO2e);
    }

    const sectorBreakdown = Array.from(sectorMap.entries()).map(
      ([sectorCode, tCO2e]) => ({
        sectorCode,
        tCO2e,
      })
    );

    // Sort by emissions descending
    sectorBreakdown.sort((a, b) => b.tCO2e - a.tCO2e);

    // Year-over-year change: compare latest with baseline or previous year
    let yearOverYearChange: {
      baselineYear: number;
      baselineTotal: number;
      currentYear: number;
      currentTotal: number;
      absoluteChange: number;
      percentChange: number;
    } | null = null;

    // Find baseline inventory
    const baseline = inventories.find((inv) => inv.baselineYear);

    if (baseline && baseline.id !== latest.id) {
      const baselineTotal =
        baseline.scope1Total + baseline.scope2Total + baseline.scope3Total;
      const absoluteChange = latestTotal - baselineTotal;
      const percentChange =
        baselineTotal !== 0 ? (absoluteChange / baselineTotal) * 100 : 0;

      yearOverYearChange = {
        baselineYear: baseline.year,
        baselineTotal,
        currentYear: latest.year,
        currentTotal: latestTotal,
        absoluteChange,
        percentChange,
      };
    } else if (inventories.length > 1) {
      // Fall back to previous year comparison
      const previous = inventories[1];
      const previousTotal =
        previous.scope1Total + previous.scope2Total + previous.scope3Total;
      const absoluteChange = latestTotal - previousTotal;
      const percentChange =
        previousTotal !== 0 ? (absoluteChange / previousTotal) * 100 : 0;

      yearOverYearChange = {
        baselineYear: previous.year,
        baselineTotal: previousTotal,
        currentYear: latest.year,
        currentTotal: latestTotal,
        absoluteChange,
        percentChange,
      };
    }

    return NextResponse.json({
      latestInventory: {
        id: latest.id,
        year: latest.year,
        status: latest.status,
        scope1Total: latest.scope1Total,
        scope2Total: latest.scope2Total,
        scope3Total: latest.scope3Total,
      },
      scopeBreakdown,
      sectorBreakdown,
      yearOverYearChange,
    });
  } catch (error) {
    console.error("GET /api/emissions/summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
