export type SAFCategoryCode = "HEFA" | "FT" | "PtL" | "AtJ" | "SIP" | "COPROCESSING";

export interface SAFCategory {
  code: SAFCategoryCode;
  name: string;
  shortName: string;
  feedstocks: string[];
  typicalCIRange: { min: number; max: number };
  blendLimit: number;
  corsiaEligible: boolean;
  maturityLevel: string;
  color: string;
}

export const SAF_CATEGORIES: Record<SAFCategoryCode, SAFCategory> = {
  HEFA: {
    code: "HEFA",
    name: "Hydroprocessed Esters and Fatty Acids",
    shortName: "HEFA",
    feedstocks: ["Used Cooking Oil", "Animal Fats", "Vegetable Oils", "Camelina Oil"],
    typicalCIRange: { min: 13.9, max: 40.4 },
    blendLimit: 50,
    corsiaEligible: true,
    maturityLevel: "Commercial",
    color: "#22c55e",
  },
  FT: {
    code: "FT",
    name: "Fischer-Tropsch",
    shortName: "FT-SPK",
    feedstocks: ["Municipal Solid Waste", "Agricultural Residues", "Woody Biomass"],
    typicalCIRange: { min: 7.7, max: 30.2 },
    blendLimit: 50,
    corsiaEligible: true,
    maturityLevel: "Early Commercial",
    color: "#3b82f6",
  },
  PtL: {
    code: "PtL",
    name: "Power-to-Liquid",
    shortName: "PtL/e-SAF",
    feedstocks: ["CO2 + Green Hydrogen", "Direct Air Capture + Electrolysis"],
    typicalCIRange: { min: 2.0, max: 15.0 },
    blendLimit: 50,
    corsiaEligible: true,
    maturityLevel: "Demonstration",
    color: "#8b5cf6",
  },
  AtJ: {
    code: "AtJ",
    name: "Alcohol-to-Jet",
    shortName: "ATJ-SPK",
    feedstocks: ["Sugarcane Ethanol", "Corn Ethanol", "Cellulosic Ethanol", "Isobutanol"],
    typicalCIRange: { min: 20.1, max: 55.8 },
    blendLimit: 50,
    corsiaEligible: true,
    maturityLevel: "Early Commercial",
    color: "#f59e0b",
  },
  SIP: {
    code: "SIP",
    name: "Synthesized Iso-Paraffins",
    shortName: "SIP",
    feedstocks: ["Sugarcane", "Cellulosic Sugars"],
    typicalCIRange: { min: 32.8, max: 60.0 },
    blendLimit: 10,
    corsiaEligible: true,
    maturityLevel: "Commercial",
    color: "#ec4899",
  },
  COPROCESSING: {
    code: "COPROCESSING",
    name: "Co-processing",
    shortName: "Co-proc",
    feedstocks: ["Lipids in Existing Refineries"],
    typicalCIRange: { min: 25.0, max: 50.0 },
    blendLimit: 5,
    corsiaEligible: false,
    maturityLevel: "Commercial",
    color: "#6b7280",
  },
};

export const SAF_CATEGORY_LIST = Object.values(SAF_CATEGORIES);
export const SAF_CATEGORY_CODES = Object.keys(SAF_CATEGORIES) as SAFCategoryCode[];

export const BASELINE_JET_FUEL_CI = 89.0; // gCO2e/MJ for conventional Jet-A1
export const JET_FUEL_ENERGY_DENSITY = 0.1267; // GJ per gallon
