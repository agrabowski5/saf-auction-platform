import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectFraudPatterns } from "@/lib/analytics/fraud";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const alerts = await detectFraudPatterns();
  return NextResponse.json(alerts);
}
