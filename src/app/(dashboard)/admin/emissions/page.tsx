"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Factory,
  Flame,
  Zap,
  Link2,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScopeDonut } from "@/components/emissions/scope-donut";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface InventoryItem {
  id: string;
  userId: string;
  year: number;
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  baselineYear: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    company: string | null;
  };
  _count?: { entries: number };
}

/* ---------- Component ---------- */

export default function AdminEmissionsPage() {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/emissions/inventories");
        if (res.ok) {
          const data = await res.json();
          setInventories(data);
        } else {
          toast.error("Failed to load inventories");
        }
      } catch (err) {
        console.error("Admin emissions fetch error:", err);
        toast.error("Failed to load emissions data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ---------- Aggregate calculations ---------- */

  // Unique companies
  const uniqueCompanies = new Set(inventories.map((inv) => inv.userId));
  const companyCount = uniqueCompanies.size;

  // Aggregate scope totals across all inventories
  const totalScope1 = inventories.reduce((s, inv) => s + inv.scope1Total, 0);
  const totalScope2 = inventories.reduce((s, inv) => s + inv.scope2Total, 0);
  const totalScope3 = inventories.reduce((s, inv) => s + inv.scope3Total, 0);
  const grandTotal = totalScope1 + totalScope2 + totalScope3;

  // Scope donut data (aggregate across all companies)
  const scopeDonutData = [
    { scope: 1, label: "Scope 1", total: totalScope1, color: "#ef4444" },
    { scope: 2, label: "Scope 2", total: totalScope2, color: "#f59e0b" },
    { scope: 3, label: "Scope 3", total: totalScope3, color: "#3b82f6" },
  ];

  // Sort inventories by year desc, then company
  const sortedInventories = [...inventories].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    const aName = a.user?.company ?? a.user?.name ?? a.userId;
    const bName = b.user?.company ?? b.user?.name ?? b.userId;
    return aName.localeCompare(bName);
  });

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Platform Emissions Overview</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate GHG inventories across all reporting companies
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Companies Reporting"
          value={companyCount.toLocaleString()}
          subtitle={`${inventories.length} total inventories`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          title="Total Scope 1"
          value={`${totalScope1.toLocaleString()} tCO2e`}
          subtitle="Direct emissions"
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          title="Total Scope 2"
          value={`${totalScope2.toLocaleString()} tCO2e`}
          subtitle="Indirect (energy)"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          title="Total Scope 3"
          value={`${totalScope3.toLocaleString()} tCO2e`}
          subtitle="Value chain"
          icon={<Link2 className="h-4 w-4" />}
        />
      </div>

      {/* Donut + grand total */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">
              Aggregate Scope Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-0">
            <ScopeDonut data={scopeDonutData} size={280} />
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Platform Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Grand Total Emissions</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {grandTotal.toLocaleString()} <span className="text-base font-normal text-muted-foreground">tCO2e</span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {grandTotal > 0
                    ? ((totalScope1 / grandTotal) * 100).toFixed(1)
                    : "0"}
                  %
                </p>
                <p className="text-xs text-muted-foreground">Scope 1</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {grandTotal > 0
                    ? ((totalScope2 / grandTotal) * 100).toFixed(1)
                    : "0"}
                  %
                </p>
                <p className="text-xs text-muted-foreground">Scope 2</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="inline-block h-2 w-2 rounded-full bg-[#3b82f6]" />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {grandTotal > 0
                    ? ((totalScope3 / grandTotal) * 100).toFixed(1)
                    : "0"}
                  %
                </p>
                <p className="text-xs text-muted-foreground">Scope 3</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Data aggregated from {companyCount} reporting{" "}
              {companyCount === 1 ? "company" : "companies"} across{" "}
              {inventories.length} inventory{" "}
              {inventories.length === 1 ? "submission" : "submissions"}.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company-by-company breakdown table */}
      <Card className="rounded-xl border bg-card p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base">Company Inventories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedInventories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No emissions inventories have been submitted.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium text-center">Year</th>
                    <th className="px-3 py-2 font-medium text-right">Scope 1</th>
                    <th className="px-3 py-2 font-medium text-right">Scope 2</th>
                    <th className="px-3 py-2 font-medium text-right">Scope 3</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                    <th className="px-3 py-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInventories.map((inv) => {
                    const invTotal =
                      inv.scope1Total + inv.scope2Total + inv.scope3Total;
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-medium">
                          {inv.user?.company ?? inv.user?.name ?? inv.userId}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {inv.year}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {inv.scope1Total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {inv.scope2Total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {inv.scope3Total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          {invTotal.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge
                            variant={
                              inv.status === "verified"
                                ? "success"
                                : inv.status === "submitted"
                                  ? "info"
                                  : "secondary"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
