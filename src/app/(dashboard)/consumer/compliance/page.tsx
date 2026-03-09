import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateEmissionsReduction } from "@/lib/compliance/emissions";
import { calculateInset } from "@/lib/compliance/inset";
import type { SAFCategoryCode } from "@/lib/constants/saf-categories";
import { COMPLIANCE_SCHEMES } from "@/lib/constants/compliance-schemes";

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const session = await auth();
  const allocations = await db.allocation.findMany({
    where: { bid: { bidderId: session?.user?.id } },
    include: { ask: { include: { facility: true } } },
  });

  const insets = allocations.map((alloc) => {
    const ci = alloc.ask.facility?.ciScore;
    return calculateInset(alloc.safCategory as SAFCategoryCode, alloc.quantity, alloc.pricePerGallon, ci ?? undefined);
  });

  const totalReduction = insets.reduce((s, i) => s + i.emissionsReduction, 0);
  const totalCost = insets.reduce((s, i) => s + i.totalCost, 0);
  const avgCostPerTon = totalReduction > 0 ? totalCost / totalReduction : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Reports</h1>
        <p className="text-sm text-muted-foreground">CORSIA, EU ETS, and other regulatory compliance tracking</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(COMPLIANCE_SCHEMES).map((scheme) => (
          <Card key={scheme.code}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{scheme.code}</CardTitle>
                <Badge variant="outline">{scheme.region}</Badge>
              </div>
              <CardDescription className="text-xs">{scheme.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{scheme.description}</p>
              <div className="mt-3 rounded-lg bg-secondary p-2">
                <p className="text-xs text-muted-foreground">Eligible reductions</p>
                <p className="text-lg font-bold tabular-nums">{totalReduction.toFixed(1)} tCO2e</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {insets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inset Summary</CardTitle>
            <CardDescription>SAF insetting vs. traditional carbon offsetting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div><p className="text-xs text-muted-foreground">Total Insetting Reduction</p><p className="text-xl font-bold">{totalReduction.toFixed(1)} tCO2e</p></div>
              <div><p className="text-xs text-muted-foreground">Total SAF Cost</p><p className="text-xl font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
              <div><p className="text-xs text-muted-foreground">Cost per tCO2e</p><p className="text-xl font-bold">${avgCostPerTon.toFixed(2)}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-left">Type</th><th className="p-2 text-left">Category</th><th className="p-2 text-right">Volume</th><th className="p-2 text-right">Reduction</th><th className="p-2 text-right">Cost/tCO2e</th></tr></thead>
              <tbody>{insets.map((inset, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2"><Badge variant="success" className="text-[10px]">{inset.type}</Badge></td>
                  <td className="p-2">{inset.safCategory}</td>
                  <td className="p-2 text-right tabular-nums">{inset.volumeGallons.toLocaleString()} gal</td>
                  <td className="p-2 text-right tabular-nums text-green-400">{inset.emissionsReduction.toFixed(2)} t</td>
                  <td className="p-2 text-right tabular-nums">${inset.costPerTonCO2e.toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
