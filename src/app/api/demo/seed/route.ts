import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { SECTOR_LIST } from "@/lib/constants/sectors";
import { ABATEMENT_TYPE_LIST } from "@/lib/constants/abatement-types";

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

    // ============================================================
    // SEED SECTORS
    // ============================================================
    const existingSector = await db.sector.findFirst();
    if (!existingSector) {
      for (const s of SECTOR_LIST) {
        await db.sector.create({
          data: { code: s.code, name: s.name, color: s.color, icon: s.icon },
        });
      }
    }

    // ============================================================
    // SEED ABATEMENT TYPES
    // ============================================================
    const existingAbType = await db.abatementType.findFirst();
    if (!existingAbType) {
      for (const a of ABATEMENT_TYPE_LIST) {
        await db.abatementType.create({
          data: {
            code: a.code,
            name: a.name,
            description: a.description,
            unit: a.unit,
            sectorCode: a.sectorCode,
            ciReduction: a.ciReduction,
            isVerified: true,
          },
        });
      }
    }

    // ============================================================
    // SEED SAMPLE EMISSIONS FOR CONSUMER
    // ============================================================
    const consumer = await db.user.findUnique({
      where: { email: "demo-consumer@saf-auction.com" },
    });

    if (consumer) {
      const existingInventory = await db.emissionsInventory.findFirst({
        where: { userId: consumer.id },
      });

      if (!existingInventory) {
        // 2024 baseline inventory
        const inv2024 = await db.emissionsInventory.create({
          data: {
            userId: consumer.id,
            year: 2024,
            baselineYear: true,
            status: "verified",
            scope1Total: 12500,
            scope2Total: 8200,
            scope3Total: 145000,
          },
        });

        // Emission entries for 2024
        await db.emissionEntry.createMany({
          data: [
            // Scope 1
            { inventoryId: inv2024.id, scope: 1, ghgCategory: "scope1_stationary", sectorCode: "ENERGY", description: "Airport terminal heating (natural gas)", activityData: 5000, activityUnit: "MWh", emissionFactor: 0.184, tCO2e: 3200, source: "Utility invoices" },
            { inventoryId: inv2024.id, scope: 1, ghgCategory: "scope1_mobile", sectorCode: "AVIATION", description: "Owned aircraft fleet operations", activityData: 50000000, activityUnit: "gal Jet-A1", emissionFactor: 0.00018, tCO2e: 9000, source: "Fuel records" },
            { inventoryId: inv2024.id, scope: 1, ghgCategory: "scope1_fugitive", sectorCode: "GENERAL", description: "Refrigerant leaks from HVAC systems", tCO2e: 300, source: "Maintenance logs" },
            // Scope 2
            { inventoryId: inv2024.id, scope: 2, ghgCategory: "scope2_electricity", sectorCode: "ENERGY", description: "Purchased electricity for HQ and facilities", activityData: 15000, activityUnit: "MWh", emissionFactor: 0.42, tCO2e: 6300, source: "Grid factor + invoices" },
            { inventoryId: inv2024.id, scope: 2, ghgCategory: "scope2_heat", sectorCode: "ENERGY", description: "District heating for operations center", activityData: 8000, activityUnit: "MWh", emissionFactor: 0.2375, tCO2e: 1900, source: "Utility data" },
            // Scope 3
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat1", sectorCode: "GENERAL", description: "Office supplies and catering services", tCO2e: 2800, source: "Spend-based" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat2", sectorCode: "MANUFACTURING", description: "Aircraft acquisitions (embodied carbon)", tCO2e: 18000, source: "Manufacturer data" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat3", sectorCode: "ENERGY", description: "Upstream fuel production & T&D losses", tCO2e: 12000, source: "Well-to-tank factors" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat4", sectorCode: "TRANSPORT", description: "Freight logistics for spare parts", tCO2e: 4500, source: "Logistics provider data" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat5", sectorCode: "GENERAL", description: "Operational waste from terminals", tCO2e: 1200, source: "Waste audits" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat6", sectorCode: "AVIATION", description: "Employee business travel (flights)", tCO2e: 65000, source: "Travel booking system" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat7", sectorCode: "TRANSPORT", description: "Employee commuting", tCO2e: 3500, source: "Employee survey" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat11", sectorCode: "CONSTRUCTION", description: "Cement and steel for new terminal construction", tCO2e: 22000, source: "Contractor reporting" },
            { inventoryId: inv2024.id, scope: 3, ghgCategory: "scope3_cat15", sectorCode: "GENERAL", description: "Investment portfolio emissions", tCO2e: 16000, source: "PCAF methodology" },
          ],
        });

        // 2025 current year inventory
        const inv2025 = await db.emissionsInventory.create({
          data: {
            userId: consumer.id,
            year: 2025,
            baselineYear: false,
            status: "draft",
            scope1Total: 11800,
            scope2Total: 7500,
            scope3Total: 138000,
          },
        });

        await db.emissionEntry.createMany({
          data: [
            { inventoryId: inv2025.id, scope: 1, ghgCategory: "scope1_stationary", sectorCode: "ENERGY", description: "Airport terminal heating (natural gas)", tCO2e: 2900, source: "Utility invoices" },
            { inventoryId: inv2025.id, scope: 1, ghgCategory: "scope1_mobile", sectorCode: "AVIATION", description: "Owned aircraft fleet operations", tCO2e: 8600, source: "Fuel records" },
            { inventoryId: inv2025.id, scope: 1, ghgCategory: "scope1_fugitive", sectorCode: "GENERAL", description: "Refrigerant leaks", tCO2e: 300, source: "Maintenance logs" },
            { inventoryId: inv2025.id, scope: 2, ghgCategory: "scope2_electricity", sectorCode: "ENERGY", description: "Purchased electricity (REC program reducing factor)", tCO2e: 5700, source: "Grid factor + RECs" },
            { inventoryId: inv2025.id, scope: 2, ghgCategory: "scope2_heat", sectorCode: "ENERGY", description: "District heating", tCO2e: 1800, source: "Utility data" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat1", sectorCode: "GENERAL", description: "Office supplies and catering", tCO2e: 2600, source: "Spend-based" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat2", sectorCode: "MANUFACTURING", description: "Aircraft acquisitions", tCO2e: 15000, source: "Manufacturer data" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat3", sectorCode: "ENERGY", description: "Upstream fuel production & T&D losses", tCO2e: 11500, source: "Well-to-tank factors" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat4", sectorCode: "TRANSPORT", description: "Freight logistics", tCO2e: 4200, source: "Logistics data" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat5", sectorCode: "GENERAL", description: "Operational waste", tCO2e: 1100, source: "Waste audits" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat6", sectorCode: "AVIATION", description: "Employee business travel (flights)", tCO2e: 60000, source: "Travel booking system" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat7", sectorCode: "TRANSPORT", description: "Employee commuting", tCO2e: 3200, source: "Employee survey" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat11", sectorCode: "CONSTRUCTION", description: "Terminal construction (reduced scope)", tCO2e: 18000, source: "Contractor reporting" },
            { inventoryId: inv2025.id, scope: 3, ghgCategory: "scope3_cat15", sectorCode: "GENERAL", description: "Investment portfolio", tCO2e: 22400, source: "PCAF methodology" },
          ],
        });

        // Abatement targets
        await db.abatementTarget.createMany({
          data: [
            { userId: consumer.id, sectorCode: "AVIATION", year: 2025, targetReduction: 15000, currentReduction: 4500, status: "active" },
            { userId: consumer.id, sectorCode: "ENERGY", year: 2025, targetReduction: 5000, currentReduction: 2800, status: "active" },
            { userId: consumer.id, sectorCode: "CONSTRUCTION", year: 2025, targetReduction: 8000, currentReduction: 1200, status: "active" },
            { userId: consumer.id, sectorCode: "TRANSPORT", year: 2025, targetReduction: 2000, currentReduction: 800, status: "active" },
            { userId: consumer.id, sectorCode: "GENERAL", year: 2025, targetReduction: 5000, currentReduction: 2000, status: "active" },
          ],
        });

        // Sample Book & Claim transactions
        const producer2 = await db.user.findUnique({
          where: { email: "demo-producer@saf-auction.com" },
        });

        if (producer2) {
          await db.bookClaimTransaction.createMany({
            data: [
              {
                buyerId: consumer.id,
                sellerId: producer2.id,
                abatementTypeCode: "SAF_HEFA",
                sectorCode: "AVIATION",
                quantity: 3000,
                pricePerUnit: 85,
                totalPrice: 255000,
                status: "retired",
                registeredAt: new Date("2025-01-15"),
                listedAt: new Date("2025-01-16"),
                purchasedAt: new Date("2025-02-01"),
                claimedAt: new Date("2025-02-15"),
                retiredAt: new Date("2025-03-01"),
              },
              {
                buyerId: consumer.id,
                sellerId: producer2.id,
                abatementTypeCode: "SAF_HEFA",
                sectorCode: "AVIATION",
                quantity: 1500,
                pricePerUnit: 88,
                totalPrice: 132000,
                status: "claimed",
                registeredAt: new Date("2025-04-01"),
                listedAt: new Date("2025-04-02"),
                purchasedAt: new Date("2025-04-10"),
                claimedAt: new Date("2025-05-01"),
              },
              {
                sellerId: producer2.id,
                abatementTypeCode: "SAF_FT",
                sectorCode: "AVIATION",
                quantity: 5000,
                pricePerUnit: 120,
                totalPrice: 600000,
                status: "listed",
                registeredAt: new Date("2025-06-01"),
                listedAt: new Date("2025-06-05"),
              },
              {
                buyerId: consumer.id,
                sellerId: producer2.id,
                abatementTypeCode: "REC_SOLAR",
                sectorCode: "ENERGY",
                quantity: 2800,
                pricePerUnit: 15,
                totalPrice: 42000,
                status: "retired",
                registeredAt: new Date("2025-02-01"),
                listedAt: new Date("2025-02-02"),
                purchasedAt: new Date("2025-02-10"),
                claimedAt: new Date("2025-03-01"),
                retiredAt: new Date("2025-03-15"),
              },
              {
                buyerId: consumer.id,
                sellerId: producer2.id,
                abatementTypeCode: "LOW_CARBON_CONCRETE",
                sectorCode: "CONSTRUCTION",
                quantity: 1200,
                pricePerUnit: 45,
                totalPrice: 54000,
                status: "purchased",
                registeredAt: new Date("2025-05-01"),
                listedAt: new Date("2025-05-02"),
                purchasedAt: new Date("2025-05-15"),
              },
              {
                buyerId: consumer.id,
                sellerId: producer2.id,
                abatementTypeCode: "VCS_CREDIT",
                sectorCode: "GENERAL",
                quantity: 2000,
                pricePerUnit: 22,
                totalPrice: 44000,
                status: "retired",
                registeredAt: new Date("2025-01-10"),
                listedAt: new Date("2025-01-11"),
                purchasedAt: new Date("2025-01-20"),
                claimedAt: new Date("2025-02-01"),
                retiredAt: new Date("2025-02-15"),
              },
            ],
          });

          // Sample demand pool
          const existingPool = await db.demandPool.findFirst();
          if (!existingPool) {
            const pool = await db.demandPool.create({
              data: {
                name: "Q3 2025 Aviation SAF Pool",
                description: "Collective purchasing pool for HEFA SAF to reduce aviation Scope 3 emissions. Airlines pool demand for better pricing.",
                sectorCode: "AVIATION",
                abatementTypeCode: "SAF_HEFA",
                targetQuantity: 25000,
                currentQuantity: 18500,
                status: "active",
              },
            });

            await db.demandPoolParticipant.create({
              data: {
                poolId: pool.id,
                userId: consumer.id,
                committedQuantity: 8500,
                status: "committed",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Demo seed error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to seed demo data", details: message }, { status: 500 });
  }
}
