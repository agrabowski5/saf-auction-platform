import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMarketAnalytics } from "@/lib/analytics/market";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const analytics = await getMarketAnalytics();
  return NextResponse.json(analytics);
}
