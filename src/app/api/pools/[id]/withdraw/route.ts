import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
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
  });

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  // Only allow withdrawal from forming or active pools
  if (pool.status !== "forming" && pool.status !== "active") {
    return NextResponse.json(
      { error: "Cannot withdraw from a pool that is not forming or active" },
      { status: 400 }
    );
  }

  // Find participant
  const participant = await db.demandPoolParticipant.findUnique({
    where: {
      poolId_userId: {
        poolId: id,
        userId: session.user.id,
      },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "You are not a participant in this pool" },
      { status: 400 }
    );
  }

  if (participant.status !== "committed") {
    return NextResponse.json(
      { error: "Can only withdraw from committed status" },
      { status: 400 }
    );
  }

  // Update participant status and decrement pool quantity in a transaction
  const [updatedParticipant] = await db.$transaction([
    db.demandPoolParticipant.update({
      where: { id: participant.id },
      data: { status: "withdrawn" },
    }),
    db.demandPool.update({
      where: { id },
      data: {
        currentQuantity: {
          decrement: participant.committedQuantity,
        },
      },
    }),
  ]);

  return NextResponse.json(updatedParticipant);
}
