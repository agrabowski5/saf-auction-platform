import { calculateEmissionsReduction } from "./emissions";
import type { SAFCategoryCode } from "@/lib/constants/saf-categories";

export interface InsetCalculation {
  type: "inset" | "offset";
  safCategory: string;
  volumeGallons: number;
  emissionsReduction: number;
  costPerTonCO2e: number;
  totalCost: number;
  description: string;
}

export function calculateInset(
  safCategory: SAFCategoryCode,
  volumeGallons: number,
  pricePerGallon: number,
  ciScore?: number
): InsetCalculation {
  const reduction = calculateEmissionsReduction(safCategory, volumeGallons, ciScore);
  const totalCost = volumeGallons * pricePerGallon;
  const costPerTon = reduction.reductionTonsCO2e > 0 ? totalCost / reduction.reductionTonsCO2e : 0;

  return {
    type: "inset",
    safCategory,
    volumeGallons,
    emissionsReduction: reduction.reductionTonsCO2e,
    costPerTonCO2e: costPerTon,
    totalCost,
    description: `SAF insetting via ${safCategory}: ${reduction.reductionPercentage.toFixed(1)}% lifecycle emissions reduction vs conventional jet fuel`,
  };
}
