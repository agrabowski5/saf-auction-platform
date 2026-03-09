"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { LifecyclePipeline } from "@/components/book-claim/lifecycle-pipeline";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STATUS_CONFIG } from "@/lib/book-claim/lifecycle";
import type { BookClaimStatus } from "@/lib/book-claim/lifecycle";
import { toast } from "sonner";
import {
  ShoppingCart,
  ClipboardCheck,
  Archive,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  PackageOpen,
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
  purchasedAt?: string;
  claimedAt?: string;
  retiredAt?: string;
}

const TAB_FILTERS = ["all", "purchased", "claimed", "retired"] as const;

export default function BookClaimPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

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

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      const endpoint =
        action === "claim"
          ? `/api/book-claim/${id}/claim`
          : `/api/book-claim/${id}/retire`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: `${action} failed` }));
        throw new Error(error.error ?? `${action} failed`);
      }

      const newStatus = action === "claim" ? "claimed" : "retired";
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, status: newStatus } : tx))
      );
      toast.success(
        action === "claim"
          ? "Abatement claimed successfully"
          : "Abatement retired successfully"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Summary stats
  const stats = {
    purchased: transactions.filter((tx) => tx.status === "purchased").length,
    claimed: transactions.filter((tx) => tx.status === "claimed").length,
    retired: transactions.filter((tx) => tx.status === "retired").length,
    totalValue: transactions.reduce((sum, tx) => sum + tx.totalPrice, 0),
  };

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : transactions.filter((tx) => tx.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Book & Claim</h1>
        <p className="text-sm text-muted-foreground">
          Manage your purchased carbon abatement credits through the claim and retirement lifecycle
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Purchased"
          value={stats.purchased.toLocaleString()}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <StatCard
          title="Claimed"
          value={stats.claimed.toLocaleString()}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <StatCard
          title="Retired"
          value={stats.retired.toLocaleString()}
          icon={<Archive className="h-4 w-4" />}
        />
        <StatCard
          title="Total Value"
          value={`$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TAB_FILTERS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab === "all" ? "All" : STATUS_CONFIG[tab as BookClaimStatus]?.label ?? tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_FILTERS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-5 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                icon={<PackageOpen className="h-12 w-12" />}
                title={
                  tab === "all"
                    ? "No transactions yet"
                    : `No ${STATUS_CONFIG[tab as BookClaimStatus]?.label?.toLowerCase() ?? tab} transactions`
                }
                description="Purchase abatement credits from the marketplace to get started."
                action={
                  <a href="/consumer/marketplace">
                    <Button>Browse Marketplace</Button>
                  </a>
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => {
                  const statusConfig = STATUS_CONFIG[tx.status as BookClaimStatus];
                  const isExpanded = expandedId === tx.id;

                  return (
                    <Card key={tx.id} className="overflow-hidden">
                      <CardContent className="p-6 space-y-4">
                        {/* Pipeline */}
                        <LifecyclePipeline currentStatus={tx.status} />

                        {/* Transaction Summary */}
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : tx.id)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-semibold text-sm">
                                {tx.abatementTypeName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: tx.sectorColor,
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {tx.sectorName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  &bull; {tx.quantity.toLocaleString()} tCO2e
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  &bull; $
                                  {tx.totalPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className="text-[10px]"
                              style={{
                                backgroundColor: `${statusConfig?.color}20`,
                                color: statusConfig?.color,
                                borderColor: `${statusConfig?.color}40`,
                              }}
                            >
                              {statusConfig?.label ?? tx.status}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t pt-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Quantity
                                </p>
                                <p className="font-medium tabular-nums">
                                  {tx.quantity.toLocaleString()} tCO2e
                                </p>
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
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Abatement Code
                                </p>
                                <p className="font-medium">
                                  {tx.abatementTypeCode}
                                </p>
                              </div>
                            </div>

                            {/* Timestamps */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              {tx.purchasedAt && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Purchased
                                  </p>
                                  <p className="font-medium">
                                    {new Date(tx.purchasedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                              {tx.claimedAt && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Claimed
                                  </p>
                                  <p className="font-medium">
                                    {new Date(tx.claimedAt).toLocaleDateString()}
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

                            {/* Seller info */}
                            {tx.sellerName && (
                              <div className="text-sm">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Seller
                                </p>
                                <p className="font-medium">
                                  {tx.sellerName}
                                  {tx.sellerCompany && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      &mdash; {tx.sellerCompany}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-2">
                              {tx.status === "purchased" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(tx.id, "claim")}
                                  disabled={actionLoading === tx.id}
                                >
                                  {actionLoading === tx.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                  )}
                                  Claim Abatement
                                </Button>
                              )}
                              {tx.status === "claimed" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(tx.id, "retire")}
                                  disabled={actionLoading === tx.id}
                                >
                                  {actionLoading === tx.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Archive className="mr-2 h-4 w-4" />
                                  )}
                                  Retire Abatement
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
