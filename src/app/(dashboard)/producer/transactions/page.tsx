"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { LifecyclePipeline } from "@/components/book-claim/lifecycle-pipeline";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STATUS_CONFIG } from "@/lib/book-claim/lifecycle";
import type { BookClaimStatus } from "@/lib/book-claim/lifecycle";
import { ABATEMENT_TYPE_LIST } from "@/lib/constants/abatement-types";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  ListChecks,
  DollarSign,
  Archive,
  Loader2,
  Send,
  PackageOpen,
  User,
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
  buyerName?: string;
  buyerCompany?: string;
  createdAt?: string;
  listedAt?: string;
  purchasedAt?: string;
  claimedAt?: string;
  retiredAt?: string;
}

export default function ProducerTransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formType, setFormType] = useState<string>("");
  const [formQuantity, setFormQuantity] = useState<string>("");
  const [formPrice, setFormPrice] = useState<string>("");

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

  const handleRegister = async () => {
    if (!formType || !formQuantity || !formPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    const quantity = parseFloat(formQuantity);
    const pricePerUnit = parseFloat(formPrice);

    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/book-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abatementTypeCode: formType,
          quantity,
          pricePerUnit,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(error.error ?? "Registration failed");
      }

      toast.success("Abatement registered successfully");
      setDialogOpen(false);
      setFormType("");
      setFormQuantity("");
      setFormPrice("");
      fetchTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleList = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/book-claim/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "listed" }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Listing failed" }));
        throw new Error(error.error ?? "Listing failed");
      }

      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, status: "listed" } : tx))
      );
      toast.success("Abatement listed on marketplace");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Listing failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Summary stats
  const stats = {
    registered: transactions.filter((tx) => tx.status === "registered").length,
    listed: transactions.filter((tx) => tx.status === "listed").length,
    soldValue: transactions
      .filter((tx) => ["purchased", "claimed", "retired"].includes(tx.status))
      .reduce((sum, tx) => sum + tx.totalPrice, 0),
    retired: transactions.filter((tx) => tx.status === "retired").length,
  };

  const selectedAbatement = ABATEMENT_TYPE_LIST.find((t) => t.code === formType);
  const computedTotal =
    formQuantity && formPrice
      ? parseFloat(formQuantity) * parseFloat(formPrice)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Register, list, and track your carbon abatement credits
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Register New Abatement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Abatement</DialogTitle>
              <DialogDescription>
                Register a verified carbon abatement credit to list on the marketplace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="abatement-type">Abatement Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="abatement-type">
                    <SelectValue placeholder="Select abatement type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ABATEMENT_TYPE_LIST.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAbatement && (
                  <p className="text-xs text-muted-foreground">
                    {selectedAbatement.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (tCO2e)</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 100"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price per Unit ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 45.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>

              {computedTotal > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Estimated Total</p>
                  <p className="text-lg font-bold tabular-nums">
                    ${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegister} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Register
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Registered"
          value={stats.registered.toLocaleString()}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          title="Listed"
          value={stats.listed.toLocaleString()}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <StatCard
          title="Total Sold Value"
          value={`$${stats.soldValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Retired"
          value={stats.retired.toLocaleString()}
          icon={<Archive className="h-4 w-4" />}
        />
      </div>

      {/* Transaction List */}
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
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-12 w-12" />}
          title="No transactions yet"
          description="Register your first carbon abatement credit to get started."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Abatement
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => {
            const statusConfig = STATUS_CONFIG[tx.status as BookClaimStatus];

            return (
              <Card key={tx.id}>
                <CardContent className="p-6 space-y-4">
                  {/* Pipeline */}
                  <LifecyclePipeline currentStatus={tx.status} />

                  {/* Transaction Details */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {tx.abatementTypeName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: tx.sectorColor }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {tx.sectorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          &bull; {tx.quantity.toLocaleString()} tCO2e
                        </span>
                        <span className="text-xs text-muted-foreground">
                          &bull; $
                          {tx.pricePerUnit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                          /unit
                        </span>
                        <span className="text-xs font-medium">
                          &bull; $
                          {tx.totalPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
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

                      {tx.status === "registered" && (
                        <Button
                          size="sm"
                          onClick={() => handleList(tx.id)}
                          disabled={actionLoading === tx.id}
                        >
                          {actionLoading === tx.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          List on Marketplace
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Buyer info for purchased+ transactions */}
                  {tx.buyerName &&
                    ["purchased", "claimed", "retired"].includes(tx.status) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                        <User className="h-3 w-3" />
                        <span>
                          Buyer: {tx.buyerName}
                          {tx.buyerCompany && ` - ${tx.buyerCompany}`}
                        </span>
                        {tx.purchasedAt && (
                          <span>
                            &bull; Purchased{" "}
                            {new Date(tx.purchasedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
