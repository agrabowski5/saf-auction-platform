import { BASELINE_JET_FUEL_CI, JET_FUEL_ENERGY_DENSITY, SAF_CATEGORIES, type SAFCategoryCode } from "@/lib/constants/saf-categories";

export interface EmissionsReduction {
  safCategory: string;
  volumeGallons: number;
  safCI: number;
  baselineCI: number;
  energyGJ: number;
  reductionGCO2e: number;
  reductionTonsCO2e: number;
  reductionPercentage: number;
}

export function calculateEmissionsReduction(
  safCategory: SAFCategoryCode,
  volumeGallons: number,
  ciScore?: number
): EmissionsReduction {
  const cat = SAF_CATEGORIES[safCategory];
  const safCI = ciScore ?? (cat.typicalCIRange.min + cat.typicalCIRange.max) / 2;
  const baselineCI = BASELINE_JET_FUEL_CI;
  const energyGJ = volumeGallons * JET_FUEL_ENERGY_DENSITY;
  const reductionGCO2e = (baselineCI - safCI) * energyGJ * 1_000_000;
  const reductionTonsCO2e = reductionGCO2e / 1_000_000;
  const reductionPercentage = ((baselineCI - safCI) / baselineCI) * 100;

  return {
    safCategory,
    volumeGallons,
    safCI,
    baselineCI,
    energyGJ,
    reductionGCO2e,
    reductionTonsCO2e,
    reductionPercentage,
  };
}

export interface ScopeEmissions {
  scope1Direct: number;
  scope3Upstream: number;
  scope3Downstream: number;
  totalWithSAF: number;
  totalWithoutSAF: number;
  netReduction: number;
}

export function calculateScopeEmissions(
  totalFuelGallons: number,
  safGallons: number,
  safCategory: SAFCategoryCode,
  safCI?: number
): ScopeEmissions {
  const conventionalGallons = totalFuelGallons - safGallons;
  const baselineCI = BASELINE_JET_FUEL_CI;
  const cat = SAF_CATEGORIES[safCategory];
  const actualSafCI = safCI ?? (cat.typicalCIRange.min + cat.typicalCIRange.max) / 2;

  const scope1Direct = conventionalGallons * JET_FUEL_ENERGY_DENSITY * baselineCI / 1000 +
    safGallons * JET_FUEL_ENERGY_DENSITY * actualSafCI / 1000;
  const scope3Upstream = totalFuelGallons * JET_FUEL_ENERGY_DENSITY * 15 / 1000;
  const scope3Downstream = 0;

  const totalWithSAF = scope1Direct + scope3Upstream;
  const totalWithoutSAF = totalFuelGallons * JET_FUEL_ENERGY_DENSITY * baselineCI / 1000 + scope3Upstream;
  const netReduction = totalWithoutSAF - totalWithSAF;

  return { scope1Direct, scope3Upstream, scope3Downstream, totalWithSAF, totalWithoutSAF, netReduction };
}
