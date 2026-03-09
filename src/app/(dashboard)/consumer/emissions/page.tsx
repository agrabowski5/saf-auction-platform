"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  Factory,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScopeDonut } from "@/components/emissions/scope-donut";
import { SectorBreakdownChart } from "@/components/emissions/sector-breakdown-chart";

interface ScopeTotalWithYoY {
  scope: number;
  label: string;
  total: number;
  previousTotal: number;
  change: number;
  changePercent: number;
}

interface InventoryItem {
  id: string;
  year: number;
  status: string;
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  entryCount: number;
  createdAt: string;
}

interface EmissionsSummary {
  scopeTotals: ScopeTotalWithYoY[];
  scopeDonutData: { scope: number; label: string; total: number; color: string }[];
  sectorBreakdown: {
    sectorName: string;
    total: number;
    color: string;
    percentage: number;
  }[];
}

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success"> = {
  draft: "secondary",
  submitted: "warning",
  verified: "success",
};

export default function EmissionsPage() {
  const router = useRouter();
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<EmissionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, sumRes] = await Promise.all([
          fetch("/api/emissions/inventories"),
          fetch("/api/emissions/summary"),
        ]);
        if (invRes.ok) {
          const data = await invRes.json();
          setInventories(data.inventories ?? data);
        }
        if (sumRes.ok) {
          const data = await sumRes.json();
          setSummary(data);
        }
      } catch {
        toast.error("Failed to load emissions data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateInventory() {
    setCreating(true);
    try {
      const res = await fetch("/api/emissions/inventories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: new Date().getFullYear() }),
      });
      if (!res.ok) throw new Error("Failed to create inventory");
      const created = await res.json();
      toast.success(`Inventory for ${created.year} created`);
      setInventories((prev) => [created, ...prev]);
    } catch {
      toast.error("Failed to create inventory");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 h-72 rounded-xl border bg-card animate-pulse" />
          <div className="lg:col-span-2 h-72 rounded-xl border bg-card animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const scopeTotals = summary?.scopeTotals ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emissions Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Scope 1, 2, and 3 emissions across reporting years
          </p>
        </div>
        <Button onClick={handleCreateInventory} disabled={creating}>
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Inventory
        </Button>
      </div>

      {/* Scope stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {scopeTotals.map((s) => {
          const decreased = s.changePercent <= 0;
          return (
            <div key={s.scope} className="rounded-xl border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {s.total.toLocaleString()} tCO2e
              </p>
              {s.previousTotal > 0 && (
                <div
                  className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                    decreased ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {decreased ? (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(s.changePercent).toFixed(1)}% YoY
                </div>
              )}
            </div>
          );
        })}

        {scopeTotals.length === 0 && (
          <>
            {[
              { label: "Scope 1 -- Direct", color: "#ef4444" },
              { label: "Scope 2 -- Indirect", color: "#f59e0b" },
              { label: "Scope 3 -- Value Chain", color: "#3b82f6" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-6">
                <p className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">
                  0 tCO2e
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Scope Proportions
          </h2>
          <div className="flex items-center justify-center">
            <ScopeDonut data={summary?.scopeDonutData ?? []} size={260} />
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Sector Breakdown
          </h2>
          <SectorBreakdownChart data={summary?.sectorBreakdown ?? []} />
        </div>
      </div>

      {/* Inventories list */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Your Inventories</h2>
        {inventories.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <Factory className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No emissions inventories yet. Create one to start tracking your
              carbon footprint.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inventories.map((inv) => {
              const grandTotal =
                inv.scope1Total + inv.scope2Total + inv.scope3Total;
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-6"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{inv.year}</h3>
                      <Badge
                        variant={STATUS_VARIANT[inv.status] ?? "secondary"}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        S1: {inv.scope1Total.toLocaleString()} tCO2e
                      </span>
                      <span>
                        S2: {inv.scope2Total.toLocaleString()} tCO2e
                      </span>
                      <span>
                        S3: {inv.scope3Total.toLocaleString()} tCO2e
                      </span>
                      <span className="font-medium text-white">
                        Total: {grandTotal.toLocaleString()} tCO2e
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inv.entryCount} {inv.entryCount === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                  <Link href={`/consumer/emissions/${inv.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
