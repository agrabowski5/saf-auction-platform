"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Building2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSectorName, getSectorColor } from "@/lib/constants/sectors";
import { toast } from "sonner";

/* ---------- Types ---------- */

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

export default function ConsumerReportsPage() {
  const { data: session } = useSession();

  const [summary, setSummary] = useState<EmissionsSummary | null>(null);
  const [targets, setTargets] = useState<TargetsProgress | null>(null);
  const [transactions, setTransactions] = useState<BookClaimTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const companyName =
    session?.user?.company ?? session?.user?.name ?? "Company";
  const reportingYear = summary?.latestInventory?.year ?? new Date().getFullYear();

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
        console.error("Reports fetch error:", err);
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ====================================================================
   * PDF Export
   * ==================================================================== */
  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // --- Title ---
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Carbon Emissions Report", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`${companyName} | Reporting Year ${reportingYear}`, pageWidth / 2, y, {
        align: "center",
      });
      y += 6;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, {
        align: "center",
      });
      y += 12;

      // --- Section: Company Profile ---
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("1. Company Profile", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Company: ${companyName}`, 14, y);
      y += 5;
      doc.text(`Reporting Year: ${reportingYear}`, 14, y);
      y += 5;
      doc.text(
        `Inventory Status: ${summary?.latestInventory?.status ?? "N/A"}`,
        14,
        y
      );
      y += 10;

      // --- Section: Emissions Summary ---
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("2. Emissions Summary", 14, y);
      y += 4;

      const scope = summary?.scopeBreakdown ?? {
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
      };
      const yoy = summary?.yearOverYearChange;

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value (tCO2e)"]],
        body: [
          ["Scope 1 (Direct)", scope.scope1.toLocaleString()],
          ["Scope 2 (Indirect Energy)", scope.scope2.toLocaleString()],
          ["Scope 3 (Value Chain)", scope.scope3.toLocaleString()],
          ["Grand Total", scope.total.toLocaleString()],
          ...(yoy
            ? [
                [
                  `YoY Change (vs ${yoy.baselineYear})`,
                  `${yoy.absoluteChange >= 0 ? "+" : ""}${yoy.absoluteChange.toLocaleString()} (${yoy.percentChange >= 0 ? "+" : ""}${yoy.percentChange.toFixed(1)}%)`,
                ],
              ]
            : []),
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // --- Section: Sector Breakdown ---
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("3. Sector Breakdown", 14, y);
      y += 4;

      const sectorRows = (summary?.sectorBreakdown ?? []).map((s) => {
        const pct =
          scope.total > 0 ? ((s.tCO2e / scope.total) * 100).toFixed(1) : "0.0";
        return [getSectorName(s.sectorCode), s.tCO2e.toLocaleString(), `${pct}%`];
      });

      if (sectorRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Sector", "Emissions (tCO2e)", "Share"]],
          body: sectorRows,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        y += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No sector breakdown data available.", 14, y);
        y += 10;
      }

      // --- Section: Reduction Targets ---
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("4. Reduction Targets", 14, y);
      y += 4;

      const targetRows = (targets?.progress ?? []).map((tp) => [
        tp.sectorName,
        tp.year.toString(),
        tp.targetReduction.toLocaleString(),
        tp.currentReduction.toLocaleString(),
        `${tp.progressPercent.toFixed(1)}%`,
        tp.status,
      ]);

      if (targetRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [
            ["Sector", "Year", "Target (tCO2e)", "Achieved", "Progress", "Status"],
          ],
          body: targetRows,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        y += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No reduction targets have been set.", 14, y);
        y += 10;
      }

      // --- Section: Abatement Portfolio ---
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("5. Abatement Portfolio (Book & Claim)", 14, y);
      y += 4;

      const txRows = transactions.map((tx) => [
        tx.abatementType?.name ?? tx.abatementTypeCode,
        getSectorName(tx.sectorCode),
        tx.quantity.toLocaleString(),
        tx.totalPrice != null ? `$${tx.totalPrice.toLocaleString()}` : "-",
        tx.status,
      ]);

      if (txRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Abatement Type", "Sector", "Qty (tCO2e)", "Cost", "Status"]],
          body: txRows,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        y += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No Book & Claim transactions recorded.", 14, y);
        y += 10;
      }

      // --- Section: Methodology Notes ---
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("6. Methodology Notes", 14, y);
      y += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const methodology = [
        "Emissions are calculated in accordance with the GHG Protocol Corporate Standard.",
        "Scope 1 covers direct emissions from owned or controlled sources.",
        "Scope 2 covers indirect emissions from purchased electricity, heating, and cooling.",
        "Scope 3 covers all other indirect emissions in the reporting company's value chain.",
        "",
        "Carbon abatement claims follow the Book & Claim chain-of-custody model, where",
        "environmental attributes are tracked and transferred independently of the physical",
        "product flow. All retired abatements are permanently recorded on the platform registry.",
      ];
      methodology.forEach((line) => {
        doc.text(line, 14, y);
        y += 4.5;
      });

      doc.save(`${companyName.replace(/\s+/g, "_")}_Emissions_Report_${reportingYear}.pdf`);
      toast.success("PDF report exported successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF report");
    } finally {
      setExportingPdf(false);
    }
  }, [summary, targets, transactions, companyName, reportingYear]);

  /* ====================================================================
   * CSV Export
   * ==================================================================== */
  const handleExportCsv = useCallback(() => {
    try {
      const scope = summary?.scopeBreakdown ?? {
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
      };

      const rows: string[][] = [
        ["Carbon Emissions Report"],
        [`Company: ${companyName}`],
        [`Reporting Year: ${reportingYear}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ["Emissions Summary"],
        ["Metric", "Value (tCO2e)"],
        ["Scope 1 (Direct)", scope.scope1.toString()],
        ["Scope 2 (Indirect Energy)", scope.scope2.toString()],
        ["Scope 3 (Value Chain)", scope.scope3.toString()],
        ["Grand Total", scope.total.toString()],
        [],
        ["Sector Breakdown"],
        ["Sector", "Emissions (tCO2e)", "Share (%)"],
        ...(summary?.sectorBreakdown ?? []).map((s) => [
          getSectorName(s.sectorCode),
          s.tCO2e.toString(),
          scope.total > 0
            ? ((s.tCO2e / scope.total) * 100).toFixed(1)
            : "0.0",
        ]),
        [],
        ["Reduction Targets"],
        ["Sector", "Year", "Target (tCO2e)", "Achieved (tCO2e)", "Progress (%)", "Status"],
        ...(targets?.progress ?? []).map((tp) => [
          tp.sectorName,
          tp.year.toString(),
          tp.targetReduction.toString(),
          tp.currentReduction.toString(),
          tp.progressPercent.toFixed(1),
          tp.status,
        ]),
        [],
        ["Abatement Portfolio (Book & Claim)"],
        ["Abatement Type", "Sector", "Quantity (tCO2e)", "Cost ($)", "Status", "Date"],
        ...transactions.map((tx) => [
          tx.abatementType?.name ?? tx.abatementTypeCode,
          getSectorName(tx.sectorCode),
          tx.quantity.toString(),
          tx.totalPrice != null ? tx.totalPrice.toString() : "",
          tx.status,
          new Date(tx.createdAt).toLocaleDateString(),
        ]),
      ];

      const csvContent = rows
        .map((row) =>
          row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${companyName.replace(/\s+/g, "_")}_Emissions_${reportingYear}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (err) {
      console.error("CSV export error:", err);
      toast.error("Failed to export CSV");
    }
  }, [summary, targets, transactions, companyName, reportingYear]);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const scope = summary?.scopeBreakdown ?? {
    scope1: 0,
    scope2: 0,
    scope3: 0,
    total: 0,
  };
  const yoy = summary?.yearOverYearChange;

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emissions Report</h1>
          <p className="text-sm text-muted-foreground">
            CDP-style disclosure report preview
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPdf} disabled={exportingPdf} size="sm">
            {exportingPdf ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Export as PDF
          </Button>
          <Button onClick={handleExportCsv} variant="outline" size="sm">
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Export as CSV
          </Button>
        </div>
      </div>

      {/* ============================================================
       * REPORT PREVIEW
       * ============================================================ */}
      <div className="space-y-6">
        {/* Report header card */}
        <Card className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Carbon Emissions Report</h2>
              <p className="text-sm text-muted-foreground">
                {companyName} | FY {reportingYear}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="text-sm font-medium">{companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reporting Year</p>
                <p className="text-sm font-medium">{reportingYear}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={
                    summary?.latestInventory?.status === "verified"
                      ? "success"
                      : summary?.latestInventory?.status === "submitted"
                        ? "info"
                        : "secondary"
                  }
                >
                  {summary?.latestInventory?.status ?? "No data"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 1: Company Profile */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">1. Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-lg border p-4 text-sm">
              <p>
                <span className="font-medium">Organization Name:</span>{" "}
                {companyName}
              </p>
              <p className="mt-1">
                <span className="font-medium">Reporting Year:</span>{" "}
                {reportingYear}
              </p>
              <p className="mt-1">
                <span className="font-medium">Reporting Framework:</span> GHG
                Protocol Corporate Standard
              </p>
              <p className="mt-1">
                <span className="font-medium">Boundary Approach:</span>{" "}
                Operational Control
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Emissions Summary */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">2. Emissions Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium text-right">
                      Emissions (tCO2e)
                    </th>
                    <th className="px-3 py-2 font-medium text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Scope 1 - Direct Emissions",
                      value: scope.scope1,
                      color: "#ef4444",
                    },
                    {
                      label: "Scope 2 - Indirect (Energy)",
                      value: scope.scope2,
                      color: "#f59e0b",
                    },
                    {
                      label: "Scope 3 - Value Chain",
                      value: scope.scope3,
                      color: "#3b82f6",
                    },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-border/50"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                          {row.label}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.value.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {scope.total > 0
                          ? ((row.value / scope.total) * 100).toFixed(1)
                          : "0.0"}
                        %
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="px-3 py-2.5">Grand Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {scope.total.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {yoy && (
              <div className="mt-4 rounded-lg border p-3 text-sm">
                <p className="font-medium">Year-over-Year Change</p>
                <p className="mt-1 text-muted-foreground">
                  Compared to {yoy.baselineYear}: {" "}
                  <span
                    className={
                      yoy.absoluteChange <= 0
                        ? "text-green-400 font-medium"
                        : "text-red-400 font-medium"
                    }
                  >
                    {yoy.absoluteChange >= 0 ? "+" : ""}
                    {yoy.absoluteChange.toLocaleString()} tCO2e (
                    {yoy.percentChange >= 0 ? "+" : ""}
                    {yoy.percentChange.toFixed(1)}%)
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Sector Breakdown */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">3. Sector Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(summary?.sectorBreakdown ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No sector data available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Sector</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Emissions (tCO2e)
                      </th>
                      <th className="px-3 py-2 font-medium text-right">Share</th>
                      <th className="px-3 py-2 font-medium w-1/3">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.sectorBreakdown ?? []).map((s) => {
                      const pct =
                        scope.total > 0
                          ? (s.tCO2e / scope.total) * 100
                          : 0;
                      return (
                        <tr
                          key={s.sectorCode}
                          className="border-b border-border/50"
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: getSectorColor(s.sectorCode),
                                }}
                              />
                              {getSectorName(s.sectorCode)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {s.tCO2e.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {pct.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: getSectorColor(s.sectorCode),
                                }}
                              />
                            </div>
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

        {/* Section 4: Reduction Targets */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">4. Reduction Targets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(targets?.progress ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No reduction targets set.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Sector</th>
                      <th className="px-3 py-2 font-medium text-center">Year</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Target (tCO2e)
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Achieved
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Progress
                      </th>
                      <th className="px-3 py-2 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(targets?.progress ?? []).map((tp) => (
                      <tr
                        key={tp.targetId}
                        className="border-b border-border/50"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: tp.sectorColor,
                              }}
                            />
                            {tp.sectorName}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {tp.year}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {tp.targetReduction.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {tp.currentReduction.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {tp.progressPercent.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge
                            variant={
                              tp.status === "achieved"
                                ? "success"
                                : tp.status === "missed"
                                  ? "destructive"
                                  : "info"
                            }
                          >
                            {tp.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Abatement Portfolio */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">
              5. Abatement Portfolio (Book & Claim)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No Book & Claim transactions recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Sector</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Qty (tCO2e)
                      </th>
                      <th className="px-3 py-2 font-medium text-right">Cost</th>
                      <th className="px-3 py-2 font-medium text-center">
                        Status
                      </th>
                      <th className="px-3 py-2 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-border/50"
                      >
                        <td className="px-3 py-2.5">
                          {tx.abatementType?.name ?? tx.abatementTypeCode}
                        </td>
                        <td className="px-3 py-2.5">
                          {tx.sector?.name ?? getSectorName(tx.sectorCode)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {tx.quantity.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {tx.totalPrice != null
                            ? `$${tx.totalPrice.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge
                            variant={
                              tx.status === "retired"
                                ? "success"
                                : tx.status === "cancelled"
                                  ? "destructive"
                                  : tx.status === "purchased" ||
                                      tx.status === "claimed"
                                    ? "warning"
                                    : "secondary"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals summary for abatement portfolio */}
            {transactions.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Total Quantity
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {transactions
                      .reduce((s, t) => s + t.quantity, 0)
                      .toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tCO2e
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Retired</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-green-400">
                    {transactions
                      .filter((t) => t.status === "retired")
                      .reduce((s, t) => s + t.quantity, 0)
                      .toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tCO2e
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    $
                    {transactions
                      .reduce((s, t) => s + (t.totalPrice ?? 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Methodology Notes */}
        <Card className="rounded-xl border bg-card p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">6. Methodology Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Emissions are calculated in accordance with the{" "}
                <span className="font-medium text-foreground">
                  GHG Protocol Corporate Standard
                </span>
                , the most widely used international accounting tool for
                government and business leaders to understand, quantify, and
                manage greenhouse gas emissions.
              </p>
              <p>
                <span className="font-medium text-foreground">Scope 1</span>{" "}
                covers direct emissions from owned or controlled sources,
                including stationary combustion, mobile combustion, process
                emissions, and fugitive emissions.
              </p>
              <p>
                <span className="font-medium text-foreground">Scope 2</span>{" "}
                covers indirect emissions from the generation of purchased
                electricity, steam, heating, and cooling consumed by the
                reporting company.
              </p>
              <p>
                <span className="font-medium text-foreground">Scope 3</span>{" "}
                encompasses all other indirect emissions that occur in a
                company's value chain, following the 15 categories defined by
                the GHG Protocol Corporate Value Chain Standard.
              </p>
              <p>
                Carbon abatement claims follow the{" "}
                <span className="font-medium text-foreground">
                  Book & Claim
                </span>{" "}
                chain-of-custody model, where environmental attributes are
                tracked and transferred independently of the physical product
                flow. All retired abatements are permanently recorded on the
                platform registry and cannot be double-counted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
