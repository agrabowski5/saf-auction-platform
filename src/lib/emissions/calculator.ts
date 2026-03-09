import { GHGScope, SCOPE_COLORS, SCOPE_LABELS } from "../constants/ghg-categories";
import { getSectorColor, getSectorName, SectorCode } from "../constants/sectors";

// Types matching Prisma models
export interface EmissionEntryData {
  scope: number;
  ghgCategory: string;
  sectorCode: string;
  tCO2e: number;
}

export interface InventoryTotals {
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  grandTotal: number;
}

export interface ScopeSummary {
  scope: GHGScope;
  label: string;
  color: string;
  total: number;
  percentage: number;
}

export interface SectorSummary {
  sectorCode: string;
  sectorName: string;
  color: string;
  total: number;
  percentage: number;
  byScope: Record<number, number>;
}

export interface CategorySummary {
  ghgCategory: string;
  label: string;
  total: number;
  percentage: number;
  sectorCode: string;
}

// Aggregate entries into scope totals
export function calculateInventoryTotals(entries: EmissionEntryData[]): InventoryTotals {
  const scope1Total = entries.filter((e) => e.scope === 1).reduce((sum, e) => sum + e.tCO2e, 0);
  const scope2Total = entries.filter((e) => e.scope === 2).reduce((sum, e) => sum + e.tCO2e, 0);
  const scope3Total = entries.filter((e) => e.scope === 3).reduce((sum, e) => sum + e.tCO2e, 0);
  return {
    scope1Total,
    scope2Total,
    scope3Total,
    grandTotal: scope1Total + scope2Total + scope3Total,
  };
}

// Break down by scope for charts
export function getScopeBreakdown(entries: EmissionEntryData[]): ScopeSummary[] {
  const totals = calculateInventoryTotals(entries);
  if (totals.grandTotal === 0) return [];

  return ([1, 2, 3] as GHGScope[]).map((scope) => {
    const total = scope === 1 ? totals.scope1Total : scope === 2 ? totals.scope2Total : totals.scope3Total;
    return {
      scope,
      label: SCOPE_LABELS[scope],
      color: SCOPE_COLORS[scope],
      total,
      percentage: (total / totals.grandTotal) * 100,
    };
  });
}

// Break down by sector for charts
export function getSectorBreakdown(entries: EmissionEntryData[]): SectorSummary[] {
  const grandTotal = entries.reduce((sum, e) => sum + e.tCO2e, 0);
  if (grandTotal === 0) return [];

  const bySector = new Map<string, { total: number; byScope: Record<number, number> }>();

  for (const entry of entries) {
    const existing = bySector.get(entry.sectorCode) ?? { total: 0, byScope: {} };
    existing.total += entry.tCO2e;
    existing.byScope[entry.scope] = (existing.byScope[entry.scope] ?? 0) + entry.tCO2e;
    bySector.set(entry.sectorCode, existing);
  }

  return Array.from(bySector.entries())
    .map(([sectorCode, data]) => ({
      sectorCode,
      sectorName: getSectorName(sectorCode),
      color: getSectorColor(sectorCode),
      total: data.total,
      percentage: (data.total / grandTotal) * 100,
      byScope: data.byScope,
    }))
    .sort((a, b) => b.total - a.total);
}

// Break down by GHG category
export function getCategoryBreakdown(entries: EmissionEntryData[]): CategorySummary[] {
  const grandTotal = entries.reduce((sum, e) => sum + e.tCO2e, 0);
  if (grandTotal === 0) return [];

  const byCat = new Map<string, { total: number; sectorCode: string }>();

  for (const entry of entries) {
    const existing = byCat.get(entry.ghgCategory) ?? { total: 0, sectorCode: entry.sectorCode };
    existing.total += entry.tCO2e;
    byCat.set(entry.ghgCategory, existing);
  }

  return Array.from(byCat.entries())
    .map(([ghgCategory, data]) => ({
      ghgCategory,
      label: ghgCategory,
      total: data.total,
      percentage: (data.total / grandTotal) * 100,
      sectorCode: data.sectorCode,
    }))
    .sort((a, b) => b.total - a.total);
}

// Gap analysis: how much remains after abatements
export interface GapAnalysis {
  sectorCode: string;
  sectorName: string;
  color: string;
  totalEmissions: number;
  targetReduction: number;
  currentReduction: number;
  remainingGap: number;
  progressPercent: number;
}

export function calculateGapAnalysis(
  sectorEmissions: SectorSummary[],
  targets: { sectorCode: string; targetReduction: number; currentReduction: number }[]
): GapAnalysis[] {
  const targetMap = new Map(targets.map((t) => [t.sectorCode, t]));

  return sectorEmissions.map((sector) => {
    const target = targetMap.get(sector.sectorCode);
    const targetReduction = target?.targetReduction ?? 0;
    const currentReduction = target?.currentReduction ?? 0;
    const remainingGap = Math.max(0, targetReduction - currentReduction);
    const progressPercent = targetReduction > 0 ? Math.min(100, (currentReduction / targetReduction) * 100) : 0;

    return {
      sectorCode: sector.sectorCode,
      sectorName: sector.sectorName,
      color: sector.color,
      totalEmissions: sector.total,
      targetReduction,
      currentReduction,
      remainingGap,
      progressPercent,
    };
  });
}

// Year-over-year comparison
export interface YoYComparison {
  scope: GHGScope;
  previousYear: number;
  currentYear: number;
  change: number;
  changePercent: number;
}

export function calculateYoYChange(
  currentEntries: EmissionEntryData[],
  previousEntries: EmissionEntryData[]
): YoYComparison[] {
  const current = calculateInventoryTotals(currentEntries);
  const previous = calculateInventoryTotals(previousEntries);

  return ([1, 2, 3] as GHGScope[]).map((scope) => {
    const curr = scope === 1 ? current.scope1Total : scope === 2 ? current.scope2Total : current.scope3Total;
    const prev = scope === 1 ? previous.scope1Total : scope === 2 ? previous.scope2Total : previous.scope3Total;
    const change = curr - prev;
    return {
      scope,
      previousYear: prev,
      currentYear: curr,
      change,
      changePercent: prev > 0 ? (change / prev) * 100 : 0,
    };
  });
}

// Abatement impact: recalculate totals after applying reductions
export function applyAbatementImpact(
  entries: EmissionEntryData[],
  abatements: { sectorCode: string; tCO2eReduced: number }[]
): { original: InventoryTotals; abated: InventoryTotals; netReduction: number } {
  const original = calculateInventoryTotals(entries);

  // Build reduction per sector
  const reductionBySector = new Map<string, number>();
  for (const a of abatements) {
    reductionBySector.set(a.sectorCode, (reductionBySector.get(a.sectorCode) ?? 0) + a.tCO2eReduced);
  }

  // Apply reductions proportionally across scopes for each sector
  const adjustedEntries = entries.map((entry) => {
    const sectorReduction = reductionBySector.get(entry.sectorCode) ?? 0;
    if (sectorReduction === 0) return entry;

    const sectorTotal = entries
      .filter((e) => e.sectorCode === entry.sectorCode)
      .reduce((sum, e) => sum + e.tCO2e, 0);

    const proportion = entry.tCO2e / sectorTotal;
    const reduction = Math.min(entry.tCO2e, sectorReduction * proportion);

    return { ...entry, tCO2e: entry.tCO2e - reduction };
  });

  const abated = calculateInventoryTotals(adjustedEntries);

  return {
    original,
    abated,
    netReduction: original.grandTotal - abated.grandTotal,
  };
}
