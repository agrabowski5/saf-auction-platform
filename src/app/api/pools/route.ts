import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sectorCode = searchParams.get("sectorCode");

  const isAdmin = session.user.role === "admin";

  // Build where clause based on role and filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (status) {
    where.status = status;
  }
  if (sectorCode) {
    where.sectorCode = sectorCode;
  }

  // Consumers see active/forming pools + completed pools where they are participant
  if (!isAdmin) {
    where.OR = [
      { status: { in: ["forming", "active"] } },
      {
        status: { in: ["clearing", "completed", "cancelled"] },
        participants: { some: { userId: session.user.id } },
      },
    ];

    // If a specific status filter is applied, narrow down
    if (status) {
      delete where.OR;
      if (status === "forming" || status === "active") {
        where.status = status;
      } else {
        where.status = status;
        where.participants = { some: { userId: session.user.id } };
      }
    }
  }

  const pools = await db.demandPool.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sector: true,
      abatementType: true,
      participants: {
        include: {
          user: {
            select: { id: true, name: true, company: true },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  return NextResponse.json(pools);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    description,
    sectorCode,
    abatementTypeCode,
    targetQuantity,
    maxPricePerUnit,
    deadline,
  } = body;

  if (!name || !sectorCode || !abatementTypeCode || !targetQuantity) {
    return NextResponse.json(
      { error: "Missing required fields: name, sectorCode, abatementTypeCode, targetQuantity" },
      { status: 400 }
    );
  }

  if (targetQuantity <= 0) {
    return NextResponse.json(
      { error: "Target quantity must be greater than 0" },
      { status: 400 }
    );
  }

  // Verify sector exists
  const sector = await db.sector.findUnique({ where: { code: sectorCode } });
  if (!sector) {
    return NextResponse.json({ error: "Invalid sector code" }, { status: 400 });
  }

  // Verify abatement type exists
  const abatementType = await db.abatementType.findUnique({
    where: { code: abatementTypeCode },
  });
  if (!abatementType) {
    return NextResponse.json({ error: "Invalid abatement type code" }, { status: 400 });
  }

  const pool = await db.demandPool.create({
    data: {
      name,
      description: description || null,
      sectorCode,
      abatementTypeCode,
      targetQuantity: parseFloat(targetQuantity),
      currentQuantity: 0,
      maxPricePerUnit: maxPricePerUnit ? parseFloat(maxPricePerUnit) : null,
      status: "forming",
      deadline: deadline ? new Date(deadline) : null,
    },
    include: {
      sector: true,
      abatementType: true,
      participants: {
        include: {
          user: {
            select: { id: true, name: true, company: true },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  return NextResponse.json(pool, { status: 201 });
}
