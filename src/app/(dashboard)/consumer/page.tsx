"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Leaf,
  Target,
  CheckCircle2,
  ArrowLeftRight,
  BarChart3,
  ShoppingCart,
  BookOpen,
  FileText,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScopeDonut } from "@/components/emissions/scope-donut";
import { SectorBreakdownChart } from "@/components/emissions/sector-breakdown-chart";
import { ProgressRing } from "@/components/emissions/progress-ring";
import { getSectorColor, getSectorName } from "@/lib/constants/sectors";
import { toast } from "sonner";

/* ---------- Type definitions for API responses ---------- */

interface EmissionsSummary {
  latestInventory: {
    id: string;
    year: number;
    status: string;
    scope1Total: number;
    scope2Total: number;
    scope3Total: number;
  } | null;
  scopeBreakdown: {
    scope1: number;
    scope2: number;
    scope3: number;
    total: number;
  };
  sectorBreakdown: { sectorCode: string; tCO2e: number }[];
  yearOverYearChange: {
    baselineYear: number;
    baselineTotal: number;
    currentYear: number;
    currentTotal: number;
    absoluteChange: number;
    percentChange: number;
  } | null;
}

interface TargetsProgress {
  summary: {
    totalTargets: number;
    totalTargetReduction: number;
    totalCurrentReduction: number;
    totalRemainingReduction: number;
    overallProgress: number;
    inventoryYear: number | null;
  };
  progress: {
    targetId: string;
    sectorCode: string;
    sectorName: string;
    sectorColor: string;
    year: number;
    targetReduction: number;
    currentReduction: number;
    remainingReduction: number;
    progressPercent: number;
    status: string;
    currentEmissions: number;
  }[];
}

interface BookClaimTransaction {
  id: string;
  buyerId: string | null;
  sellerId: string;
  abatementTypeCode: string;
  sectorCode: string;
  quantity: number;
  pricePerUnit: number | null;
  totalPrice: number | null;
  status: string;
  createdAt: string;
  abatementType?: { name: string };
  sector?: { name: string };
}

/* ---------- Component ---------- */

export default function ConsumerDashboard() {
  const { data: session } = useSession();

  const [summary, setSummary] = useState<EmissionsSummary | null>(null);
  const [targets, setTargets] = useState<TargetsProgress | null>(null);
  const [transactions, setTransactions] = useState<BookClaimTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, targetsRes, txRes] = await Promise.all([
          fetch("/api/emissions/summary"),
          fetch("/api/targets/progress"),
          fetch("/api/book-claim"),
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (targetsRes.ok) setTargets(await targetsRes.json());
        if (txRes.ok) setTransactions(await txRes.json());
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* Derived values */
  const grandTotal = summary?.scopeBreakdown.total ?? 0;
  const overallProgress = targets?.summary.overallProgress ?? 0;

  const retiredQty = transactions
    .filter((t) => t.status === "retired")
    .reduce((sum, t) => sum + t.quantity, 0);

  const activeTransactions = transactions.filter(
    (t) => t.status !== "retired" && t.status !== "cancelled"
  ).length;

  /* Scope donut data */
  const scopeDonutData = summary
    ? [
        {
          scope: 1,
          label: "Scope 1",
          total: summary.scopeBreakdown.scope1,
          color: "#ef4444",
        },
        {
          scope: 2,
          label: "Scope 2",
          total: summary.scopeBreakdown.scope2,
          color: "#f59e0b",
        },
        {
          scope: 3,
          label: "Scope 3",
          total: summary.scopeBreakdown.scope3,
          color: "#3b82f6",
        },
      ]
    : [];

  /* Sector breakdown chart data */
  const sectorChartData = (summary?.sectorBreakdown ?? []).map((s) => {
    const total = summary?.scopeBreakdown.total ?? 1;
    return {
      sectorName: getSectorName(s.sectorCode),
      total: s.tCO2e,
      color: getSectorColor(s.sectorCode),
      percentage: total > 0 ? (s.tCO2e / total) * 100 : 0,
    };
  });

  /* Quick links configuration */
  const quickLinks = [
    {
      label: "View Emissions",
      href: "/consumer/emissions",
      icon: BarChart3,
      description: "Manage your GHG inventory",
    },
    {
      label: "Marketplace",
      href: "/consumer/marketplace",
      icon: ShoppingCart,
      description: "Browse carbon abatements",
    },
    {
      label: "Book & Claim",
      href: "/consumer/book-claim",
      icon: BookOpen,
      description: "Track abatement transactions",
    },
    {
      label: "Reports",
      href: "/consumer/reports",
      icon: FileText,
      description: "Generate CDP-style reports",
    },
  ];

  /* ---------- Loading state ---------- */
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
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Emissions Overview</h1>
        <p className="text-sm text-muted-foreground">
          {session?.user?.company ?? session?.user?.name ?? "Company"} &mdash;{" "}
          {summary?.latestInventory
            ? `Reporting year ${summary.latestInventory.year}`
            : "No inventory yet"}
        </p>
      </div>

      {/* Top row -- 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Emissions"
          value={`${grandTotal.toLocaleString()} tCO2e`}
          subtitle={
            summary?.yearOverYearChange
              ? `${summary.yearOverYearChange.percentChange >= 0 ? "+" : ""}${summary.yearOverYearChange.percentChange.toFixed(1)}% vs ${summary.yearOverYearChange.baselineYear}`
              : "Latest inventory"
          }
          icon={<Leaf className="h-4 w-4" />}
        />
        <StatCard
          title="Target Progress"
          value={`${overallProgress.toFixed(1)}%`}
          subtitle={
            targets
              ? `${targets.summary.totalTargets} active target${targets.summary.totalTargets !== 1 ? "s" : ""}`
              : "No targets set"
          }
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          title="Abatements Retired"
          value={`${retiredQty.toLocaleString()} tCO2e`}
          subtitle="Book & Claim retired"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          title="Active Transactions"
          value={activeTransactions.toLocaleString()}
          subtitle="Non-retired, non-cancelled"
          icon={<ArrowLeftRight className="h-4 w-4" />}
        />
      </div>

      {/* Second row -- Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scope Donut */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Scope Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-0">
            <ScopeDonut data={scopeDonutData} size={260} />
          </CardContent>
        </Card>

        {/* Sector Breakdown */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Sector Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SectorBreakdownChart data={sectorChartData} />
          </CardContent>
        </Card>
      </div>

      {/* Third row -- Target Progress */}
      {targets && targets.progress.length > 0 && (
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-base">Reduction Target Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
              {/* Large overall progress ring */}
              <div className="flex flex-col items-center">
                <ProgressRing
                  percent={overallProgress}
                  size={160}
                  strokeWidth={12}
                  color={overallProgress >= 75 ? "#22c55e" : overallProgress >= 40 ? "#f59e0b" : "#ef4444"}
                  label="Overall Progress"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {targets.summary.totalCurrentReduction.toLocaleString()} /{" "}
                  {targets.summary.totalTargetReduction.toLocaleString()} tCO2e
                </p>
              </div>

              {/* Sector-level bars */}
              <div className="flex-1 space-y-4 w-full">
                {targets.progress.map((tp) => (
                  <div key={tp.targetId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{tp.sectorName}</span>
                      <span className="text-muted-foreground">
                        {tp.progressPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(tp.progressPercent, 100)}%`,
                          backgroundColor: tp.sectorColor,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tp.currentReduction.toLocaleString()} / {tp.targetReduction.toLocaleString()} tCO2e reduced
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
