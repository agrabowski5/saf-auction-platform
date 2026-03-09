import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    // Find the target and verify ownership
    const target = await db.abatementTarget.findUnique({
      where: { id },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    if (session.user.role !== "admin" && target.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { targetReduction, currentReduction, status } = body;

    const updateData: Record<string, unknown> = {};
    if (targetReduction !== undefined) updateData.targetReduction = targetReduction;
    if (currentReduction !== undefined) updateData.currentReduction = currentReduction;
    if (status !== undefined) updateData.status = status;

    const updated = await db.abatementTarget.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/targets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
