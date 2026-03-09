"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Upload,
  ChevronDown,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScopeDonut } from "@/components/emissions/scope-donut";
import { SectorBreakdownChart } from "@/components/emissions/sector-breakdown-chart";
import { ScopeBadge } from "@/components/emissions/scope-badge";
import { SectorBadge } from "@/components/emissions/sector-badge";
import {
  getScopeBreakdown,
  getSectorBreakdown,
  calculateInventoryTotals,
} from "@/lib/emissions/calculator";

interface EmissionEntry {
  id: string;
  scope: number;
  ghgCategory: string;
  sectorCode: string;
  description: string | null;
  tCO2e: number;
  source: string | null;
  createdAt: string;
}

interface Inventory {
  id: string;
  year: number;
  status: string;
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  entries: EmissionEntry[];
}

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success"> = {
  draft: "secondary",
  submitted: "warning",
  verified: "success",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["draft", "verified"],
  verified: ["submitted"],
};

type SortField = "scope" | "ghgCategory" | "sectorCode" | "tCO2e";
type SortDir = "asc" | "desc";

export default function InventoryDetailPage({
  params,
}: {
  params: Promise<{ inventoryId: string }>;
}) {
  const { inventoryId } = use(params);
  const router = useRouter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("tCO2e");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/emissions/inventories/${inventoryId}`);
        if (!res.ok) throw new Error("Failed to load inventory");
        const data = await res.json();
        setInventory(data);
      } catch {
        toast.error("Failed to load inventory");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inventoryId]);

  async function handleStatusChange(newStatus: string) {
    setStatusMenuOpen(false);
    try {
      const res = await fetch(`/api/emissions/inventories/${inventoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setInventory((prev) =>
        prev ? { ...prev, status: updated.status ?? newStatus } : prev
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDeleteEntry(entryId: string) {
    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/emissions/entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      setInventory((prev) => {
        if (!prev) return prev;
        const entries = prev.entries.filter((e) => e.id !== entryId);
        const totals = calculateInventoryTotals(entries);
        return {
          ...prev,
          entries,
          scope1Total: totals.scope1Total,
          scope2Total: totals.scope2Total,
          scope3Total: totals.scope3Total,
        };
      });
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "tCO2e" ? "desc" : "asc");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl border bg-card animate-pulse" />
        <div className="h-64 rounded-xl border bg-card animate-pulse" />
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/consumer/emissions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Emissions
        </Button>
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Inventory not found.</p>
        </div>
      </div>
    );
  }

  const entries = inventory.entries ?? [];
  const totals = calculateInventoryTotals(entries);
  const scopeData = getScopeBreakdown(entries);
  const sectorData = getSectorBreakdown(entries);
  const allowedTransitions = STATUS_TRANSITIONS[inventory.status] ?? [];

  // Sort entries
  const sortedEntries = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "scope":
        cmp = a.scope - b.scope;
        break;
      case "ghgCategory":
        cmp = (a.ghgCategory ?? "").localeCompare(b.ghgCategory ?? "");
        break;
      case "sectorCode":
        cmp = a.sectorCode.localeCompare(b.sectorCode);
        break;
      case "tCO2e":
        cmp = a.tCO2e - b.tCO2e;
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push("/consumer/emissions")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Emissions
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{inventory.year} Inventory</h1>
            <Badge variant={STATUS_VARIANT[inventory.status] ?? "secondary"}>
              {inventory.status}
            </Badge>

            {/* Status dropdown */}
            {allowedTransitions.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                >
                  Edit Status
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
                {statusMenuOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
                    {allowedTransitions.map((s) => (
                      <button
                        key={s}
                        className="block w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => handleStatusChange(s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} &bull;{" "}
            {totals.grandTotal.toLocaleString()} tCO2e total
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/consumer/emissions/new?inventoryId=${inventoryId}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </Link>
          <Link href="/consumer/emissions/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Scope totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Scope 1 -- Direct", total: totals.scope1Total, color: "#ef4444" },
          { label: "Scope 2 -- Indirect", total: totals.scope2Total, color: "#f59e0b" },
          { label: "Scope 3 -- Value Chain", total: totals.scope3Total, color: "#3b82f6" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {s.total.toLocaleString()} tCO2e
            </p>
            {totals.grandTotal > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {((s.total / totals.grandTotal) * 100).toFixed(1)}% of total
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Scope Proportions
          </h2>
          <div className="flex items-center justify-center">
            <ScopeDonut data={scopeData} size={260} />
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Sector Breakdown
          </h2>
          <SectorBreakdownChart data={sectorData} />
        </div>
      </div>

      {/* Entries table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-medium">Emission Entries</h2>
        </div>
        {sortedEntries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No entries yet.{" "}
              <Link
                href={`/consumer/emissions/new?inventoryId=${inventoryId}`}
                className="text-primary hover:underline"
              >
                Add your first entry
              </Link>{" "}
              or{" "}
              <Link
                href="/consumer/emissions/import"
                className="text-primary hover:underline"
              >
                import from CSV
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <SortableHeader
                    label="Scope"
                    field="scope"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Category"
                    field="ghgCategory"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Sector"
                    field="sectorCode"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="p-3 text-left font-medium">Description</th>
                  <SortableHeader
                    label="tCO2e"
                    field="tCO2e"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <th className="p-3 text-left font-medium">Source</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b hover:bg-accent/30 transition-colors"
                  >
                    <td className="p-3">
                      <ScopeBadge scope={entry.scope as 1 | 2 | 3} />
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {entry.ghgCategory || "--"}
                    </td>
                    <td className="p-3">
                      <SectorBadge sectorCode={entry.sectorCode} />
                    </td>
                    <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                      {entry.description || "--"}
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {entry.tCO2e.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {entry.source || "--"}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sortable header helper                                             */
/* ------------------------------------------------------------------ */

function SortableHeader({
  label,
  field,
  current,
  dir,
  onSort,
  className = "text-left",
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th className={`p-3 font-medium ${className}`}>
      <button
        className="inline-flex items-center gap-1 hover:text-white transition-colors"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${active ? "text-white" : "opacity-40"}`}
        />
      </button>
    </th>
  );
}
