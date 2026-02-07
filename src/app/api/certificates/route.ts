import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateCertNumber } from "@/lib/compliance/registry-mock";

const certSchema = z.object({
  certType: z.string(),
  registryScheme: z.string().optional(),
  safCategory: z.string(),
  quantity: z.number().positive(),
  ciScore: z.number().optional(),
  vintageYear: z.number().int(),
  facilityId: z.string().optional(),
  allocationId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.user.role === "admin" ? {} : { holderId: session.user.id };
  const certs = await db.certificate.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(certs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const validated = certSchema.safeParse(body);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const cert = await db.certificate.create({
    data: {
      ...validated.data,
      holderId: session.user.id,
      certNumber: generateCertNumber(validated.data.certType),
    },
  });

  return NextResponse.json(cert, { status: 201 });
}
