"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmissionEntryForm } from "@/components/emissions/emission-entry-form";

interface InventoryOption {
  id: string;
  year: number;
  status: string;
}

interface RecentEntry {
  id?: string;
  scope: number;
  sectorCode: string;
  description?: string;
  tco2e: number;
  source?: string;
  createdAt: string;
}

const selectClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring";

export default function NewEmissionEntryPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <NewEmissionEntryContent />
    </Suspense>
  );
}

function NewEmissionEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInventoryId = searchParams.get("inventoryId");

  const [inventories, setInventories] = useState<InventoryOption[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>(
    preselectedInventoryId ?? ""
  );
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInventories() {
      try {
        const res = await fetch("/api/emissions/inventories");
        if (res.ok) {
          const data = await res.json();
          const list: InventoryOption[] = data.inventories ?? data;
          setInventories(list);

          // If preselected and valid, keep it; otherwise pick the first
          if (preselectedInventoryId) {
            const match = list.find((i) => i.id === preselectedInventoryId);
            if (match) setSelectedInventoryId(match.id);
            else if (list.length > 0) setSelectedInventoryId(list[0].id);
          } else if (list.length > 0 && !selectedInventoryId) {
            setSelectedInventoryId(list[0].id);
          }
        }
      } catch {
        toast.error("Failed to load inventories");
      } finally {
        setLoading(false);
      }
    }
    loadInventories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmitEntry(entry: any) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/emissions/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to add entry");
      }

      const created = await res.json();
      toast.success("Emission entry added");

      setRecentEntries((prev) => [
        {
          id: created.id,
          scope: entry.scope,
          sectorCode: entry.sectorCode,
          description: entry.description,
          tco2e: entry.tco2e,
          source: entry.source,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-xl border bg-card animate-pulse" />
      </div>
    );
  }

  if (inventories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Add Emission Entry</h1>
          <p className="text-sm text-muted-foreground">
            Record individual emission sources into your inventory
          </p>
        </div>
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            You need an emissions inventory before adding entries.
          </p>
          <Button
            className="mt-4"
            onClick={async () => {
              try {
                const res = await fetch("/api/emissions/inventories", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ year: new Date().getFullYear() }),
                });
                if (!res.ok) throw new Error();
                const created = await res.json();
                toast.success(`Inventory for ${created.year} created`);
                setInventories([created]);
                setSelectedInventoryId(created.id);
              } catch {
                toast.error("Failed to create inventory");
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Inventory for {new Date().getFullYear()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Add Emission Entry</h1>
          <p className="text-sm text-muted-foreground">
            Record individual emission sources into your inventory
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/consumer/emissions")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Done
        </Button>
      </div>

      {/* Inventory selector */}
      <div className="rounded-xl border bg-card p-6">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Select Inventory
        </label>
        <select
          className={selectClassName}
          value={selectedInventoryId}
          onChange={(e) => setSelectedInventoryId(e.target.value)}
        >
          {inventories.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.year} ({inv.status})
            </option>
          ))}
        </select>
      </div>

      {/* Entry form */}
      {selectedInventoryId && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            New Entry
          </h2>
          <EmissionEntryForm
            inventoryId={selectedInventoryId}
            onSubmit={handleSubmitEntry}
            onCancel={() => router.push("/consumer/emissions")}
          />
          {submitting && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving entry...
            </div>
          )}
        </div>
      )}

      {/* Recent entries from this session */}
      {recentEntries.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Added This Session ({recentEntries.length})
          </h2>
          <div className="space-y-2">
            {recentEntries.map((entry, idx) => (
              <div
                key={entry.id ?? idx}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Scope {entry.scope}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {entry.sectorCode}
                    </Badge>
                  </div>
                  {entry.description && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {entry.tco2e.toLocaleString()} tCO2e
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
