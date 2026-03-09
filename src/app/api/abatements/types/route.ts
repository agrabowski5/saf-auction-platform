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
    const sectorCode = searchParams.get("sectorCode");

    const where: Record<string, unknown> = {};
    if (sectorCode) {
      where.sectorCode = sectorCode;
    }

    const abatementTypes = await db.abatementType.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        sector: true,
      },
    });

    return NextResponse.json(abatementTypes);
  } catch (error) {
    console.error("GET /api/abatements/types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
