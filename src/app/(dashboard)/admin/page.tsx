"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Gavel,
  Layers,
  DollarSign,
  Plus,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/* ---------- Type definitions ---------- */

interface AuctionItem {
  id: string;
  title: string;
  status: string;
  auctionType: string;
  categories: string;
  startTime: string;
  endTime: string;
  _count: { bids: number; asks: number };
}

interface PoolItem {
  id: string;
  name: string;
  status: string;
  sectorCode: string;
  targetQuantity: number;
  currentQuantity: number;
  _count: { participants: number };
}

interface TransactionItem {
  id: string;
  status: string;
  quantity: number;
  totalPrice: number | null;
  sectorCode: string;
  abatementTypeCode: string;
  createdAt: string;
  buyer?: { name: string; company: string | null } | null;
  seller?: { name: string; company: string | null };
  abatementType?: { name: string };
  sector?: { name: string };
}

/* ---------- Status colour map for transaction bars ---------- */
const TX_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  registered: { label: "Registered", color: "#94a3b8" },
  listed: { label: "Listed", color: "#3b82f6" },
  purchased: { label: "Purchased", color: "#f59e0b" },
  claimed: { label: "Claimed", color: "#8b5cf6" },
  retired: { label: "Retired", color: "#22c55e" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
};

/* ---------- Component ---------- */

export default function AdminDashboard() {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [auctionsRes, poolsRes, txRes, usersRes] = await Promise.all([
          fetch("/api/auctions"),
          fetch("/api/pools"),
          fetch("/api/book-claim"),
          fetch("/api/auctions").then(() =>
            // Attempt a lightweight user count; falls back if no endpoint
            fetch("/api/auctions")
          ),
        ]);

        if (auctionsRes.ok) setAuctions(await auctionsRes.json());
        if (poolsRes.ok) setPools(await poolsRes.json());
        if (txRes.ok) setTransactions(await txRes.json());

        // Try to count distinct users from transactions + pools
        // Since there's no dedicated user count endpoint, derive it
        try {
          const txData: TransactionItem[] = await txRes.clone().json().catch(() => []);
          const uniqueUsers = new Set<string>();
          txData.forEach((t) => {
            if (t.buyer?.name) uniqueUsers.add(t.buyer.name);
            if (t.seller?.name) uniqueUsers.add(t.seller.name);
          });
          // If we got useful data, set it; otherwise leave null
          if (uniqueUsers.size > 0) {
            setUserCount(uniqueUsers.size);
          }
        } catch {
          // silently ignore
        }
      } catch (err) {
        console.error("Admin dashboard fetch error:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* Derived stats */
  const activeAuctions = auctions.filter((a) => a.status === "open").length;
  const activePools = pools.filter(
    (p) => p.status === "forming" || p.status === "active"
  ).length;
  const totalVolume = transactions.reduce(
    (sum, t) => sum + (t.totalPrice ?? 0),
    0
  );

  /* Transaction status counts for the horizontal bar chart */
  const statusCounts: Record<string, number> = {};
  transactions.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
  });
  const totalTxCount = transactions.length || 1;

  /* Recent 5 transactions */
  const recentTx = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  /* Quick links */
  const quickLinks = [
    {
      label: "Manage Auctions",
      href: "/admin/auctions",
      icon: Gavel,
      description: "Create and oversee auctions",
    },
    {
      label: "Manage Pools",
      href: "/admin/pools",
      icon: Layers,
      description: "Demand pool administration",
    },
    {
      label: "View Transactions",
      href: "/admin/transactions",
      icon: ClipboardList,
      description: "Book & Claim transactions",
    },
    {
      label: "Audit Log",
      href: "/admin/audit",
      icon: ShieldCheck,
      description: "Platform activity audit trail",
    },
  ];

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-52" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-muted-foreground">
            Admin dashboard &mdash; Carbon Abatement Marketplace
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/auctions/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Auction
            </Button>
          </Link>
          <Link href="/admin/pools">
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Pool
            </Button>
          </Link>
        </div>
      </div>

      {/* Top row -- 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={userCount !== null ? userCount.toLocaleString() : "\u2014"}
          subtitle="Platform participants"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Active Auctions"
          value={activeAuctions.toLocaleString()}
          subtitle={`${auctions.length} total`}
          icon={<Gavel className="h-4 w-4" />}
        />
        <StatCard
          title="Active Pools"
          value={activePools.toLocaleString()}
          subtitle={`${pools.length} total (forming + active)`}
          icon={<Layers className="h-4 w-4" />}
        />
        <StatCard
          title="Transaction Volume"
          value={`$${totalVolume.toLocaleString()}`}
          subtitle={`${transactions.length} transactions`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Second row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transaction status breakdown */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="text-base">Transaction Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {Object.entries(TX_STATUS_CONFIG).map(([status, config]) => {
              const count = statusCounts[status] ?? 0;
              const pct = (count / totalTxCount) * 100;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No transactions yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity feed */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link href="/admin/transactions">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {recentTx.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="truncate text-sm font-medium">
                        {tx.abatementType?.name ?? tx.abatementTypeCode}
                      </p>
                      <Badge
                        variant={
                          tx.status === "retired"
                            ? "success"
                            : tx.status === "cancelled"
                              ? "destructive"
                              : tx.status === "purchased"
                                ? "warning"
                                : "info"
                        }
                        className="shrink-0"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tx.quantity.toLocaleString()} tCO2e
                      {tx.totalPrice != null &&
                        ` \u00B7 $${tx.totalPrice.toLocaleString()}`}
                      {" \u00B7 "}
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom -- Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <link.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
