import { SectorCode } from "./sectors";

export interface AbatementTypeDef {
  code: string;
  name: string;
  description: string;
  sectorCode: SectorCode;
  unit: string;
  ciReduction: number | null; // typical tCO2e reduction per unit, null = varies
  mechanism: "inset" | "offset" | "credit";
  registries: string[];
}

export const ABATEMENT_TYPES: Record<string, AbatementTypeDef> = {
  // Aviation abatements (4 SAF pathways)
  SAF_HEFA: {
    code: "SAF_HEFA",
    name: "SAF — HEFA",
    description: "Hydroprocessed Esters and Fatty Acids sustainable aviation fuel",
    sectorCode: "AVIATION",
    unit: "tCO2e",
    ciReduction: 0.80,
    mechanism: "inset",
    registries: ["RSB", "ISCC"],
  },
  SAF_FT: {
    code: "SAF_FT",
    name: "SAF — Fischer-Tropsch",
    description: "Gasification-based synthetic aviation fuel from waste biomass",
    sectorCode: "AVIATION",
    unit: "tCO2e",
    ciReduction: 0.90,
    mechanism: "inset",
    registries: ["RSB", "ISCC"],
  },
  SAF_PTL: {
    code: "SAF_PTL",
    name: "SAF — Power-to-Liquid (e-SAF)",
    description: "Synthetic fuel from green hydrogen and captured CO2",
    sectorCode: "AVIATION",
    unit: "tCO2e",
    ciReduction: 0.95,
    mechanism: "inset",
    registries: ["RSB"],
  },
  SAF_ATJ: {
    code: "SAF_ATJ",
    name: "SAF — Alcohol-to-Jet",
    description: "Jet fuel produced from ethanol or isobutanol",
    sectorCode: "AVIATION",
    unit: "tCO2e",
    ciReduction: 0.70,
    mechanism: "inset",
    registries: ["RSB", "ISCC"],
  },

  // Construction abatements
  LOW_CARBON_CONCRETE: {
    code: "LOW_CARBON_CONCRETE",
    name: "Low-Carbon Concrete Credits",
    description: "Credits from use of supplementary cementitious materials or carbon-cured concrete",
    sectorCode: "CONSTRUCTION",
    unit: "tCO2e",
    ciReduction: 0.40,
    mechanism: "inset",
    registries: ["Verra"],
  },
  MASS_TIMBER: {
    code: "MASS_TIMBER",
    name: "Mass Timber Substitution Credits",
    description: "Emission reductions from replacing steel/concrete with mass timber",
    sectorCode: "CONSTRUCTION",
    unit: "tCO2e",
    ciReduction: null,
    mechanism: "inset",
    registries: ["Verra", "GoldStandard"],
  },

  // Energy abatements
  REC_SOLAR: {
    code: "REC_SOLAR",
    name: "Solar Renewable Energy Certificate",
    description: "RECs from grid-connected solar photovoltaic installations",
    sectorCode: "ENERGY",
    unit: "tCO2e",
    ciReduction: null,
    mechanism: "credit",
    registries: ["GreenE", "IREC"],
  },
  REC_WIND: {
    code: "REC_WIND",
    name: "Wind Renewable Energy Certificate",
    description: "RECs from onshore or offshore wind energy generation",
    sectorCode: "ENERGY",
    unit: "tCO2e",
    ciReduction: null,
    mechanism: "credit",
    registries: ["GreenE", "IREC"],
  },

  // Transport abatements
  EV_FLEET: {
    code: "EV_FLEET",
    name: "EV Fleet Transition Credits",
    description: "Emission reductions from transitioning fleet vehicles to electric",
    sectorCode: "TRANSPORT",
    unit: "tCO2e",
    ciReduction: 0.65,
    mechanism: "inset",
    registries: ["Verra"],
  },

  // General / cross-sector credits
  VCS_CREDIT: {
    code: "VCS_CREDIT",
    name: "Verified Carbon Standard Credit",
    description: "Carbon credits from verified emission reduction or removal projects",
    sectorCode: "GENERAL",
    unit: "tCO2e",
    ciReduction: 1.0,
    mechanism: "offset",
    registries: ["Verra"],
  },
  GS_CREDIT: {
    code: "GS_CREDIT",
    name: "Gold Standard Credit",
    description: "Premium carbon credits with sustainable development co-benefits",
    sectorCode: "GENERAL",
    unit: "tCO2e",
    ciReduction: 1.0,
    mechanism: "offset",
    registries: ["GoldStandard"],
  },
};

export const ABATEMENT_TYPE_LIST = Object.values(ABATEMENT_TYPES);
export const ABATEMENT_TYPE_CODES = Object.keys(ABATEMENT_TYPES);

export function getAbatementTypesForSector(sectorCode: string): AbatementTypeDef[] {
  return ABATEMENT_TYPE_LIST.filter((a) => a.sectorCode === sectorCode);
}

export function getAbatementType(code: string): AbatementTypeDef | undefined {
  return ABATEMENT_TYPES[code];
}

export const MECHANISM_LABELS: Record<string, string> = {
  inset: "Insetting (Value Chain Reduction)",
  offset: "Offsetting (Compensation)",
  credit: "Environmental Attribute Certificate",
};

export const MECHANISM_COLORS: Record<string, string> = {
  inset: "#22c55e",
  offset: "#f59e0b",
  credit: "#3b82f6",
};
