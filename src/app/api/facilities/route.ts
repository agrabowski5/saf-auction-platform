import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const facilitySchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  safCategory: z.string(),
  annualCapacity: z.number().positive(),
  ciScore: z.number().positive(),
  feedstock: z.string().min(2),
  certifications: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    session.user.role === "admin"
      ? {}
      : { producerId: session.user.id };

  const facilities = await db.productionFacility.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(facilities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "producer") {
    return NextResponse.json({ error: "Producers only" }, { status: 403 });
  }

  const body = await req.json();
  const validated = facilitySchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json({ error: "Invalid input", details: validated.error.flatten() }, { status: 400 });
  }

  const { certifications, ...data } = validated.data;

  const facility = await db.productionFacility.create({
    data: {
      ...data,
      producerId: session.user.id,
      certifications: JSON.stringify(certifications),
    },
  });

  return NextResponse.json(facility, { status: 201 });
}
