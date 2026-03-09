import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type BookClaimStatus,
  canTransition,
} from "@/lib/book-claim/lifecycle";

export async function GET(
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
      include: {
        buyer: true,
        seller: true,
        abatementType: true,
        sector: true,
        certificate: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify user is buyer, seller, or admin
    const isBuyer = transaction.buyerId === session.user.id;
    const isSeller = transaction.sellerId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("GET /api/book-claim/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
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

    // Verify user is buyer, seller, or admin
    const isBuyer = transaction.buyerId === session.user.id;
    const isSeller = transaction.sellerId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { status, pricePerUnit, buyerId } = body;

    const updateData: Record<string, unknown> = {};

    // Handle status transition
    if (status) {
      const currentStatus = transaction.status as BookClaimStatus;
      const newStatus = status as BookClaimStatus;

      if (!canTransition(currentStatus, newStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from "${currentStatus}" to "${newStatus}"`,
          },
          { status: 400 }
        );
      }

      // Validate purchased transition requirements
      if (newStatus === "purchased") {
        const effectiveBuyerId = buyerId || transaction.buyerId;
        const effectivePrice = pricePerUnit ?? transaction.pricePerUnit;

        if (!effectiveBuyerId) {
          return NextResponse.json(
            { error: "buyerId is required when transitioning to purchased" },
            { status: 400 }
          );
        }
        if (effectivePrice == null) {
          return NextResponse.json(
            { error: "pricePerUnit is required when transitioning to purchased" },
            { status: 400 }
          );
        }
      }

      updateData.status = newStatus;

      // Set corresponding timestamp
      const timestampMap: Record<string, string> = {
        listed: "listedAt",
        purchased: "purchasedAt",
        claimed: "claimedAt",
        retired: "retiredAt",
      };

      const timestampField = timestampMap[newStatus];
      if (timestampField) {
        updateData[timestampField] = new Date();
      }
    }

    // Handle optional field updates
    if (pricePerUnit !== undefined) {
      if (typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
        return NextResponse.json(
          { error: "pricePerUnit must be a positive number" },
          { status: 400 }
        );
      }
      updateData.pricePerUnit = pricePerUnit;
      updateData.totalPrice = transaction.quantity * pricePerUnit;
    }

    if (buyerId !== undefined) {
      // Validate buyer exists
      const buyer = await db.user.findUnique({ where: { id: buyerId } });
      if (!buyer) {
        return NextResponse.json(
          { error: "Buyer not found" },
          { status: 400 }
        );
      }
      updateData.buyerId = buyerId;
    }

    const updated = await db.bookClaimTransaction.update({
      where: { id },
      data: updateData,
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
    console.error("PATCH /api/book-claim/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
