import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/book-claim/lifecycle";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await db.bookClaimTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Only the buyer can claim
    if (transaction.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the buyer can claim this transaction" },
        { status: 403 }
      );
    }

    // Validate status transition: purchased -> claimed
    if (!canTransition(transaction.status as "purchased", "claimed")) {
      return NextResponse.json(
        {
          error: `Cannot claim transaction in "${transaction.status}" status. Must be "purchased".`,
        },
        { status: 400 }
      );
    }

    // Use a transaction to update both the Book & Claim transaction and the AbatementTarget atomically
    const currentYear = new Date().getFullYear();

    const result = await db.$transaction(async (tx) => {
      // Update the transaction status to claimed
      const updated = await tx.bookClaimTransaction.update({
        where: { id },
        data: {
          status: "claimed",
          claimedAt: new Date(),
        },
        include: {
          buyer: true,
          seller: true,
          abatementType: true,
          sector: true,
          certificate: true,
        },
      });

      // Update the buyer's AbatementTarget for the matching sector
      // Try to find an existing target for this sector and current year
      const existingTarget = await tx.abatementTarget.findUnique({
        where: {
          userId_sectorCode_year: {
            userId: session.user.id,
            sectorCode: transaction.sectorCode,
            year: currentYear,
          },
        },
      });

      if (existingTarget) {
        await tx.abatementTarget.update({
          where: { id: existingTarget.id },
          data: {
            currentReduction: {
              increment: transaction.quantity,
            },
          },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/book-claim/[id]/claim error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
