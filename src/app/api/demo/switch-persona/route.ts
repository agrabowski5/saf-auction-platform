import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isDemo) {
    return NextResponse.json({ error: "Demo mode only" }, { status: 403 });
  }

  const { role } = await req.json();
  if (!["producer", "consumer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  return NextResponse.json({ role });
}
