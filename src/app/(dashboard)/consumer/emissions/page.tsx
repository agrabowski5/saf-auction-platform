import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Leaf, TrendingDown, Fuel, BarChart3 } from "lucide-react";
import { calculateEmissionsReduction } from "@/lib/compliance/emissions";
import type { SAFCategoryCode } from "@/lib/constants/saf-categories";

export default async function EmissionsPage() {
  const session = await auth();
  const allocations = await db.allocation.findMany({
    where: { bid: { bidderId: session?.user?.id } },
    include: { ask: { include: { facility: true } } },
  });

  let totalReduction = 0;
  let totalVolume = 0;
  const reductions = allocations.map((alloc) => {
    const ciScore = alloc.ask.facility?.ciScore;
    const r = calculateEmissionsReduction(alloc.safCategory as SAFCategoryCode, alloc.quantity, ciScore ?? undefined);
    totalReduction += r.reductionTonsCO2e;
    totalVolume += alloc.quantity;
    return { ...r, allocationId: alloc.id };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emissions Tracking</h1>
        <p className="text-sm text-muted-foreground">Scope 1 and Scope 3 emissions impact from SAF purchases</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total CO2e Reduced" value={`${totalReduction.toFixed(1)} tCO2e`} icon={<Leaf className="h-4 w-4" />} />
        <StatCard title="SAF Volume" value={`${totalVolume.toLocaleString()} gal`} icon={<Fuel className="h-4 w-4" />} />
        <StatCard title="Avg Reduction" value={totalVolume > 0 ? `${((totalReduction / totalVolume) * 1000).toFixed(1)} kgCO2e/gal` : "0"} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard title="Allocations" value={allocations.length.toString()} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Emissions Reductions by Allocation</CardTitle></CardHeader>
        <CardContent>
          {reductions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No SAF allocations yet. Win auctions to see emissions impact.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-left">Category</th><th className="p-2 text-right">Volume</th><th className="p-2 text-right">SAF CI</th><th className="p-2 text-right">Baseline CI</th><th className="p-2 text-right">Reduction %</th><th className="p-2 text-right">CO2e Reduced</th></tr></thead>
              <tbody>{reductions.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{r.safCategory}</td>
                  <td className="p-2 text-right tabular-nums">{r.volumeGallons.toLocaleString()} gal</td>
                  <td className="p-2 text-right tabular-nums">{r.safCI.toFixed(1)}</td>
                  <td className="p-2 text-right tabular-nums">{r.baselineCI.toFixed(1)}</td>
                  <td className="p-2 text-right tabular-nums text-green-400">{r.reductionPercentage.toFixed(1)}%</td>
                  <td className="p-2 text-right tabular-nums">{r.reductionTonsCO2e.toFixed(2)} t</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
