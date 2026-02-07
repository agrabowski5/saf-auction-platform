import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const hashedPassword = await hash("demo-password-123", 12);

    // Create demo users (upsert to avoid duplicates)
    const demoUsers = [
      {
        email: "demo-producer@saf-auction.com",
        name: "Maria Chen",
        role: "producer",
        company: "Neste Oil Corporation",
      },
      {
        email: "demo-consumer@saf-auction.com",
        name: "James Hartfield",
        role: "consumer",
        company: "Delta Air Lines",
      },
      {
        email: "demo-admin@saf-auction.com",
        name: "Sarah Mitchell",
        role: "admin",
        company: "SAF Exchange Authority",
      },
    ];

    for (const user of demoUsers) {
      await db.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          ...user,
          hashedPassword,
          isDemo: true,
          verified: true,
        },
      });
    }

    // Get producer user
    const producer = await db.user.findUnique({
      where: { email: "demo-producer@saf-auction.com" },
    });

    if (producer) {
      // Create production facilities
      const existingFacility = await db.productionFacility.findFirst({
        where: { producerId: producer.id },
      });

      if (!existingFacility) {
        await db.productionFacility.createMany({
          data: [
            {
              producerId: producer.id,
              name: "Porvoo HEFA Plant",
              location: "Porvoo, Finland",
              safCategory: "HEFA",
              annualCapacity: 100000,
              ciScore: 22.5,
              certifications: JSON.stringify(["RSB", "ISCC"]),
              feedstock: "Used Cooking Oil",
              status: "active",
            },
            {
              producerId: producer.id,
              name: "Rotterdam FT Facility",
              location: "Rotterdam, Netherlands",
              safCategory: "FT",
              annualCapacity: 50000,
              ciScore: 12.8,
              certifications: JSON.stringify(["ISCC"]),
              feedstock: "Municipal Solid Waste",
              status: "active",
            },
            {
              producerId: producer.id,
              name: "Singapore AtJ Plant",
              location: "Singapore",
              safCategory: "AtJ",
              annualCapacity: 30000,
              ciScore: 35.2,
              certifications: JSON.stringify(["RSB"]),
              feedstock: "Sugarcane Ethanol",
              status: "active",
            },
          ],
        });
      }
    }

    // Create sample auctions
    const existingAuction = await db.auction.findFirst();
    if (!existingAuction) {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await db.auction.createMany({
        data: [
          {
            title: "Q1 2026 HEFA Forward Auction",
            description: "Quarterly forward auction for HEFA-pathway SAF. Delivery to major US hubs.",
            status: "open",
            auctionType: "vickrey",
            categories: JSON.stringify(["HEFA"]),
            startTime: now,
            endTime: oneDayFromNow,
            reservePricePerGal: 4.5,
            minBidQuantity: 10000,
          },
          {
            title: "Multi-Category Spring 2026 Auction",
            description: "VCG multi-category auction accepting HEFA, FT, and AtJ pathway SAF with cross-category substitution.",
            status: "open",
            auctionType: "vcg",
            categories: JSON.stringify(["HEFA", "FT", "AtJ"]),
            startTime: oneHourFromNow,
            endTime: twoDaysFromNow,
            aggregateReserve: 500000,
            minBidQuantity: 5000,
            substitutionMatrix: JSON.stringify({
              "HEFA->FT": 0.95,
              "HEFA->AtJ": 0.85,
              "FT->HEFA": 1.05,
              "FT->AtJ": 0.90,
              "AtJ->HEFA": 1.15,
              "AtJ->FT": 1.10,
            }),
          },
          {
            title: "December 2025 PtL Spot Auction",
            description: "Completed spot auction for Power-to-Liquid SAF.",
            status: "settled",
            auctionType: "vickrey",
            categories: JSON.stringify(["PtL"]),
            startTime: threeDaysAgo,
            endTime: oneDayAgo,
            reservePricePerGal: 7.0,
            minBidQuantity: 1000,
          },
          {
            title: "Q2 2026 EU Compliance Auction",
            description: "Upcoming auction targeting EU ETS compliance. CORSIA-eligible pathways only.",
            status: "draft",
            auctionType: "vcg",
            categories: JSON.stringify(["HEFA", "FT", "PtL"]),
            startTime: twoDaysFromNow,
            endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            aggregateReserve: 1000000,
            minBidQuantity: 25000,
          },
        ],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Demo seed error:", error);
    return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 });
  }
}
