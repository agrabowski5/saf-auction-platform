"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AbatementCard } from "@/components/book-claim/abatement-card";
import type { AbatementTransaction } from "@/components/book-claim/abatement-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTOR_LIST } from "@/lib/constants/sectors";
import { ABATEMENT_TYPE_LIST } from "@/lib/constants/abatement-types";
import { toast } from "sonner";
import { Store, Loader2, RefreshCw, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiTransaction {
  id: string;
  abatementTypeCode: string;
  abatementTypeName: string;
  sectorCode: string;
  sectorName: string;
  sectorColor: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: string;
  sellerName?: string;
  sellerCompany?: string;
}

function mapTransaction(tx: ApiTransaction): AbatementTransaction {
  return {
    id: tx.id,
    abatementType: { name: tx.abatementTypeName, code: tx.abatementTypeCode },
    sector: { name: tx.sectorName, color: tx.sectorColor },
    quantity: tx.quantity,
    pricePerUnit: tx.pricePerUnit,
    totalPrice: tx.totalPrice,
    status: tx.status,
    seller: tx.sellerName
      ? { name: tx.sellerName, company: tx.sellerCompany ?? "" }
      : null,
  };
}

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<AbatementTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/book-claim?status=listed");
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data: ApiTransaction[] = await res.json();
      setTransactions(data.map(mapTransaction));
    } catch {
      toast.error("Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleAction = async (id: string, action: string) => {
    if (action !== "purchase" || !session?.user?.id) return;

    setPurchasing(id);
    try {
      const res = await fetch(`/api/book-claim/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "purchased" }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Purchase failed" }));
        throw new Error(error.error ?? "Purchase failed");
      }

      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      toast.success("Abatement purchased successfully", {
        description: "View it in your Book & Claim dashboard.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  const filtered = transactions.filter((tx) => {
    if (sectorFilter !== "all" && tx.sector.name !== sectorFilter) return false;
    if (typeFilter !== "all" && tx.abatementType.code !== typeFilter) return false;
    return true;
  });

  const uniqueSectors = [
    ...new Set(transactions.map((tx) => tx.sector.name)),
  ];
  const uniqueTypes = [
    ...new Set(transactions.map((tx) => tx.abatementType.code)),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abatement Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Browse and purchase sector-matched carbon abatement credits
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchListings}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {(uniqueSectors.length > 0 ? uniqueSectors : SECTOR_LIST.map((s) => s.name)).map(
              (name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Abatement Types</SelectItem>
            {(uniqueTypes.length > 0
              ? ABATEMENT_TYPE_LIST.filter((t) => uniqueTypes.includes(t.code))
              : ABATEMENT_TYPE_LIST
            ).map((type) => (
              <SelectItem key={type.code} value={type.code}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(sectorFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSectorFilter("all");
              setTypeFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Listing grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="h-12 w-12" />}
          title="No listings available"
          description={
            transactions.length > 0
              ? "No listings match your current filters. Try adjusting the filters above."
              : "There are no abatement credits listed for sale right now. Check back later."
          }
          action={
            transactions.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSectorFilter("all");
                  setTypeFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tx) => (
            <div key={tx.id} className="relative">
              {purchasing === tx.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <AbatementCard transaction={tx} onAction={handleAction} />
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length.toLocaleString()} of {transactions.length.toLocaleString()} listings
        </p>
      )}
    </div>
  );
}
