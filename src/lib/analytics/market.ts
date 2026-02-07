import { db } from "@/lib/db";

export async function getMarketAnalytics() {
  const results = await db.auctionResult.findMany({
    include: { auction: true, allocations: true },
    orderBy: { clearedAt: "desc" },
  });

  const totalVolume = results.reduce((s, r) => s + r.totalVolume, 0);
  const totalValue = results.reduce((s, r) => s + r.totalValue, 0);
  const avgPrice = totalVolume > 0 ? totalValue / totalVolume : 0;
  const avgWelfare = results.length > 0 ? results.reduce((s, r) => s + (r.socialWelfare ?? 0), 0) / results.length : 0;

  const priceHistory = results.map((r) => ({
    date: r.clearedAt.toISOString(),
    avgPrice: r.averagePrice,
    volume: r.totalVolume,
    mechanism: r.mechanism,
  }));

  const categoryVolumes: Record<string, number> = {};
  for (const result of results) {
    try {
      const cats = JSON.parse(result.categoryResults) as Array<{ category: string; volume: number }>;
      for (const cat of cats) {
        categoryVolumes[cat.category] = (categoryVolumes[cat.category] ?? 0) + cat.volume;
      }
    } catch {}
  }

  return {
    totalAuctions: results.length,
    totalVolume,
    totalValue,
    avgPrice,
    avgWelfare,
    priceHistory,
    categoryVolumes,
    participationRate: results.length > 0 ? results.filter((r) => r.totalVolume > 0).length / results.length : 0,
  };
}
