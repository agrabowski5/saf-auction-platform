import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTransitionPool, type PoolStatus } from "@/lib/pools/manager";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const pool = await db.demandPool.findUnique({
    where: { id },
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
      auction: true,
      transactions: true,
    },
  });

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  // Verify access: admin can see all, consumers must be participants
  const isAdmin = session.user.role === "admin";
  const isParticipant = pool.participants.some(
    (p) => p.userId === session.user.id
  );

  if (!isAdmin && !isParticipant) {
    // Allow viewing forming/active pools for consumers (they may want to join)
    if (pool.status !== "forming" && pool.status !== "active") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  return NextResponse.json(pool);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, name, targetQuantity, auctionId } = body;

  const pool = await db.demandPool.findUnique({ where: { id } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  // Validate status transition if status change is requested
  if (status && status !== pool.status) {
    if (!canTransitionPool(pool.status as PoolStatus, status as PoolStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${pool.status} -> ${status}`,
        },
        { status: 400 }
      );
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (status) updateData.status = status;
  if (name) updateData.name = name;
  if (targetQuantity !== undefined)
    updateData.targetQuantity = parseFloat(targetQuantity);
  if (auctionId !== undefined) updateData.auctionId = auctionId;

  const updated = await db.demandPool.update({
    where: { id },
    data: updateData,
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

  return NextResponse.json(updated);
}
