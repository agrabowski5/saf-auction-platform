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

    // Only the buyer or admin can retire
    const isBuyer = transaction.buyerId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isBuyer && !isAdmin) {
      return NextResponse.json(
        { error: "Only the buyer or an admin can retire this transaction" },
        { status: 403 }
      );
    }

    // Validate status transition: claimed -> retired
    if (!canTransition(transaction.status as "claimed", "retired")) {
      return NextResponse.json(
        {
          error: `Cannot retire transaction in "${transaction.status}" status. Must be "claimed".`,
        },
        { status: 400 }
      );
    }

    const updated = await db.bookClaimTransaction.update({
      where: { id },
      data: {
        status: "retired",
        retiredAt: new Date(),
      },
      include: {
        buyer: true,
        seller: true,
        abatementType: true,
        sector: true,
        certificate: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/book-claim/[id]/retire error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
