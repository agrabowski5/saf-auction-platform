"use client";

import { useEffect, useState, useCallback } from "react";
import { LifecyclePipeline } from "@/components/book-claim/lifecycle-pipeline";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, LIFECYCLE_STAGES } from "@/lib/book-claim/lifecycle";
import type { BookClaimStatus } from "@/lib/book-claim/lifecycle";
import { SECTOR_LIST } from "@/lib/constants/sectors";
import { toast } from "sonner";
import {
  BarChart3,
  DollarSign,
  ListChecks,
  Archive,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
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
  buyerName?: string;
  buyerCompany?: string;
  createdAt?: string;
  listedAt?: string;
  purchasedAt?: string;
  claimedAt?: string;
  retiredAt?: string;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/book-claim");
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data: Transaction[] = await res.json();
      setTransactions(data);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Summary stats
  const stats = {
    total: transactions.length,
    totalValue: transactions.reduce((sum, tx) => sum + tx.totalPrice, 0),
    activeListings: transactions.filter((tx) => tx.status === "listed").length,
    retired: transactions.filter((tx) => tx.status === "retired").length,
  };

  const filtered = transactions.filter((tx) => {
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    if (sectorFilter !== "all" && tx.sectorCode !== sectorFilter) return false;
    return true;
  });

  function truncateId(id: string): string {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Admin overview of all Book & Claim transactions on the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTransactions}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Transactions"
          value={stats.total.toLocaleString()}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          title="Total Value"
          value={`$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Active Listings"
          value={stats.activeListings.toLocaleString()}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <StatCard
          title="Completed Retirements"
          value={stats.retired.toLocaleString()}
          icon={<Archive className="h-4 w-4" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LIFECYCLE_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {STATUS_CONFIG[stage].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {SECTOR_LIST.map((sector) => (
              <SelectItem key={sector.code} value={sector.code}>
                {sector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || sectorFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setSectorFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Transaction Table */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-12 w-12" />}
          title="No transactions found"
          description={
            transactions.length > 0
              ? "No transactions match the current filters."
              : "No Book & Claim transactions have been created yet."
          }
          action={
            transactions.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSectorFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-[100px_1fr_1fr_1fr_1fr_100px_80px_80px_40px] gap-2 border-b p-3 text-xs font-medium text-muted-foreground">
              <span>ID</span>
              <span>Seller</span>
              <span>Buyer</span>
              <span>Type</span>
              <span>Sector</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Price</span>
              <span>Status</span>
              <span />
            </div>

            {/* Table rows */}
            {filtered.map((tx) => {
              const statusConfig = STATUS_CONFIG[tx.status as BookClaimStatus];
              const isExpanded = expandedId === tx.id;

              return (
                <div key={tx.id} className="border-b last:border-b-0">
                  {/* Row */}
                  <div
                    className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_1fr_1fr_100px_80px_80px_40px] gap-2 p-3 items-center cursor-pointer hover:bg-accent/30 transition-colors text-sm"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateId(tx.id)}
                    </span>
                    <span className="truncate">
                      {tx.sellerName ?? (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </span>
                    <span className="truncate">
                      {tx.buyerName ?? (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </span>
                    <span className="truncate text-xs">
                      {tx.abatementTypeName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tx.sectorColor }}
                      />
                      <span className="text-xs truncate">{tx.sectorName}</span>
                    </div>
                    <span className="text-right tabular-nums text-xs">
                      {tx.quantity.toLocaleString()}
                    </span>
                    <span className="text-right tabular-nums text-xs">
                      ${tx.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                    <Badge
                      className="text-[9px] justify-center"
                      style={{
                        backgroundColor: `${statusConfig?.color}20`,
                        color: statusConfig?.color,
                        borderColor: `${statusConfig?.color}40`,
                      }}
                    >
                      {statusConfig?.label ?? tx.status}
                    </Badge>
                    <div className="flex justify-center">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/10 p-4 space-y-4">
                      <LifecyclePipeline currentStatus={tx.status} />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Full ID
                          </p>
                          <p className="font-mono text-xs break-all">
                            {tx.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Abatement Code
                          </p>
                          <p className="font-medium">{tx.abatementTypeCode}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Price / Unit
                          </p>
                          <p className="font-medium tabular-nums">
                            $
                            {tx.pricePerUnit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Total Price
                          </p>
                          <p className="font-medium tabular-nums">
                            $
                            {tx.totalPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Seller
                          </p>
                          <p className="font-medium">
                            {tx.sellerName ?? "-"}
                            {tx.sellerCompany && (
                              <span className="text-muted-foreground">
                                {" "}
                                ({tx.sellerCompany})
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Buyer
                          </p>
                          <p className="font-medium">
                            {tx.buyerName ?? "-"}
                            {tx.buyerCompany && (
                              <span className="text-muted-foreground">
                                {" "}
                                ({tx.buyerCompany})
                              </span>
                            )}
                          </p>
                        </div>
                        {tx.createdAt && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Created
                            </p>
                            <p className="font-medium">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {tx.retiredAt && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Retired
                            </p>
                            <p className="font-medium">
                              {new Date(tx.retiredAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length.toLocaleString()} of{" "}
          {transactions.length.toLocaleString()} transactions
        </p>
      )}
    </div>
  );
}
