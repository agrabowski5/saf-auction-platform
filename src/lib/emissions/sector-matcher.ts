import { ALL_GHG_CATEGORIES, GHGCategory } from "../constants/ghg-categories";
import { ABATEMENT_TYPE_LIST, AbatementTypeDef, getAbatementTypesForSector } from "../constants/abatement-types";
import { SectorCode, SECTORS } from "../constants/sectors";

// Auto-detect sector from GHG category
export function suggestSector(ghgCategoryId: string): SectorCode {
  const cat = ALL_GHG_CATEGORIES.find((c) => c.id === ghgCategoryId);
  return cat?.defaultSector ?? "GENERAL";
}

// Suggest GHG category from description keywords
const KEYWORD_MAP: Record<string, string> = {
  flight: "scope3_cat6",
  flying: "scope3_cat6",
  airline: "scope3_cat6",
  aviation: "scope3_cat6",
  "air travel": "scope3_cat6",
  cement: "scope3_cat11",
  concrete: "scope3_cat11",
  construction: "scope3_cat1",
  building: "scope3_cat2",
  electricity: "scope2_electricity",
  power: "scope2_electricity",
  "natural gas": "scope1_stationary",
  heating: "scope1_stationary",
  boiler: "scope1_stationary",
  fleet: "scope1_mobile",
  vehicle: "scope1_mobile",
  truck: "scope1_mobile",
  commut: "scope3_cat7",
  "business travel": "scope3_cat6",
  hotel: "scope3_cat6",
  waste: "scope3_cat5",
  landfill: "scope3_cat5",
  freight: "scope3_cat4",
  shipping: "scope3_cat4",
  logistics: "scope3_cat4",
  refrigerant: "scope1_fugitive",
  cooling: "scope2_cooling",
};

export function suggestGHGCategory(description: string): string | null {
  const lower = description.toLowerCase();
  for (const [keyword, categoryId] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return categoryId;
  }
  return null;
}

// Find matching abatement types for a sector
export function findMatchingAbatements(sectorCode: string): AbatementTypeDef[] {
  const sectorAbatements = getAbatementTypesForSector(sectorCode);
  // Always include general cross-sector credits as fallback
  const generalCredits = getAbatementTypesForSector("GENERAL");
  const combined = [...sectorAbatements];
  for (const gc of generalCredits) {
    if (!combined.find((a) => a.code === gc.code)) {
      combined.push(gc);
    }
  }
  return combined;
}

// Calculate the gap for a specific sector and suggest abatements
export interface SectorGapSuggestion {
  sectorCode: SectorCode;
  sectorName: string;
  totalEmissions: number;
  targetReduction: number;
  currentAbated: number;
  remainingGap: number;
  suggestedAbatements: Array<{
    abatementType: AbatementTypeDef;
    estimatedQuantity: number;
    isInset: boolean;
  }>;
}

export function suggestAbatementsForGap(
  sectorCode: string,
  totalEmissions: number,
  targetReduction: number,
  currentAbated: number
): SectorGapSuggestion {
  const sector = SECTORS[sectorCode as SectorCode];
  const remainingGap = Math.max(0, targetReduction - currentAbated);
  const matchingAbatements = findMatchingAbatements(sectorCode);

  // Sort: insets first (sector-specific), then offsets
  const sorted = [...matchingAbatements].sort((a, b) => {
    if (a.mechanism === "inset" && b.mechanism !== "inset") return -1;
    if (a.mechanism !== "inset" && b.mechanism === "inset") return 1;
    if (a.sectorCode === sectorCode && b.sectorCode !== sectorCode) return -1;
    if (a.sectorCode !== sectorCode && b.sectorCode === sectorCode) return 1;
    return 0;
  });

  let remaining = remainingGap;
  const suggestions = sorted.map((abatement) => {
    const quantity = remaining > 0 ? remaining : 0;
    remaining = 0;
    return {
      abatementType: abatement,
      estimatedQuantity: quantity,
      isInset: abatement.mechanism === "inset",
    };
  }).filter((s) => s.estimatedQuantity > 0);

  return {
    sectorCode: sectorCode as SectorCode,
    sectorName: sector?.name ?? sectorCode,
    totalEmissions,
    targetReduction,
    currentAbated,
    remainingGap,
    suggestedAbatements: suggestions,
  };
}

// Get all sectors represented in emission entries
export function getActiveSectors(
  entries: { sectorCode: string }[]
): { code: SectorCode; name: string; color: string; entryCount: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.sectorCode, (counts.get(e.sectorCode) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([code, count]) => ({
      code: code as SectorCode,
      name: SECTORS[code as SectorCode]?.name ?? code,
      color: SECTORS[code as SectorCode]?.color ?? "#94a3b8",
      entryCount: count,
    }))
    .sort((a, b) => b.entryCount - a.entryCount);
}
