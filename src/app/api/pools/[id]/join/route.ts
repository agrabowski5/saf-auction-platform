import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateJoinRequest } from "@/lib/pools/manager";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "consumer") {
    return NextResponse.json(
      { error: "Only consumers can join demand pools" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const { committedQuantity } = body;

  if (!committedQuantity || committedQuantity <= 0) {
    return NextResponse.json(
      { error: "Committed quantity must be greater than 0" },
      { status: 400 }
    );
  }

  const pool = await db.demandPool.findUnique({
    where: { id },
  });

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  // Check if user is already a participant
  const existingParticipant = await db.demandPoolParticipant.findUnique({
    where: {
      poolId_userId: {
        poolId: id,
        userId: session.user.id,
      },
    },
  });

  // Validate join request using pool manager
  const validation = validateJoinRequest(
    pool,
    parseFloat(committedQuantity),
    !!existingParticipant
  );

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const quantity = parseFloat(committedQuantity);

  // Create participant and update pool quantity in a transaction
  const [participant] = await db.$transaction([
    db.demandPoolParticipant.create({
      data: {
        poolId: id,
        userId: session.user.id,
        committedQuantity: quantity,
        allocatedQuantity: 0,
        status: "committed",
      },
      include: {
        user: {
          select: { id: true, name: true, company: true },
        },
      },
    }),
    db.demandPool.update({
      where: { id },
      data: {
        currentQuantity: {
          increment: quantity,
        },
      },
    }),
  ]);

  return NextResponse.json(participant, { status: 201 });
}
