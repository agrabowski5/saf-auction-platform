import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mockVerifyCertificate } from "@/lib/compliance/registry-mock";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { certificateId } = await req.json();
  const cert = await db.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = mockVerifyCertificate(cert.registryScheme ?? "RSB", cert.certNumber);

  await db.certificate.update({
    where: { id: certificateId },
    data: {
      verificationStatus: result.verified ? "verified" : "rejected",
      verifiedAt: result.verified ? new Date() : null,
      ciScore: result.verified ? result.details.ciScore : cert.ciScore,
    },
  });

  return NextResponse.json(result);
}
