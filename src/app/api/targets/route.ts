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

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (year) {
      where.year = parseInt(year, 10);
    }

    const targets = await db.abatementTarget.findMany({
      where,
      orderBy: [{ year: "desc" }, { sectorCode: "asc" }],
      include: {
        sector: true,
      },
    });

    return NextResponse.json(targets);
  } catch (error) {
    console.error("GET /api/targets error:", error);
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
    const { sectorCode, year, targetReduction } = body;

    if (!sectorCode || !year || targetReduction == null) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: sectorCode, year, targetReduction",
        },
        { status: 400 }
      );
    }

    if (typeof year !== "number" || typeof targetReduction !== "number") {
      return NextResponse.json(
        { error: "year and targetReduction must be numbers" },
        { status: 400 }
      );
    }

    const target = await db.abatementTarget.create({
      data: {
        userId: session.user.id,
        sectorCode,
        year,
        targetReduction,
        currentReduction: 0,
        status: "active",
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    console.error("POST /api/targets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
