import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isDemo) {
    return NextResponse.json({ error: "Demo mode only" }, { status: 403 });
  }

  const { role } = await req.json();
  if (!["producer", "consumer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Look up the target demo user so the JWT can fully switch identity
  const targetUser = await db.user.findUnique({
    where: { email: `demo-${role}@saf-auction.com` },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: targetUser.id,
    role: targetUser.role,
    name: targetUser.name,
    email: targetUser.email,
    company: targetUser.company,
  });
}
