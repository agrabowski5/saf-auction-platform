import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearAuction } from "@/lib/auction-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await clearAuction(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clearing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
