export type SectorCode =
  | "AVIATION"
  | "CONSTRUCTION"
  | "ENERGY"
  | "MANUFACTURING"
  | "TRANSPORT"
  | "AGRICULTURE"
  | "CHEMICALS"
  | "MINING"
  | "TECHNOLOGY"
  | "GENERAL";

export interface SectorDef {
  code: SectorCode;
  name: string;
  color: string;
  icon: string; // lucide icon name
  description: string;
}

export const SECTORS: Record<SectorCode, SectorDef> = {
  AVIATION: {
    code: "AVIATION",
    name: "Aviation",
    color: "#3b82f6",
    icon: "Plane",
    description: "Air travel and cargo operations",
  },
  CONSTRUCTION: {
    code: "CONSTRUCTION",
    name: "Construction",
    color: "#f59e0b",
    icon: "HardHat",
    description: "Building materials, cement, and construction activities",
  },
  ENERGY: {
    code: "ENERGY",
    name: "Energy",
    color: "#22c55e",
    icon: "Zap",
    description: "Electricity generation, heating, and cooling",
  },
  MANUFACTURING: {
    code: "MANUFACTURING",
    name: "Manufacturing",
    color: "#8b5cf6",
    icon: "Factory",
    description: "Industrial production and processing",
  },
  TRANSPORT: {
    code: "TRANSPORT",
    name: "Ground Transport",
    color: "#06b6d4",
    icon: "Truck",
    description: "Road, rail, and maritime transportation",
  },
  AGRICULTURE: {
    code: "AGRICULTURE",
    name: "Agriculture",
    color: "#84cc16",
    icon: "Wheat",
    description: "Farming, livestock, and land use",
  },
  CHEMICALS: {
    code: "CHEMICALS",
    name: "Chemicals",
    color: "#ec4899",
    icon: "FlaskConical",
    description: "Chemical production and processing",
  },
  MINING: {
    code: "MINING",
    name: "Mining & Extraction",
    color: "#78716c",
    icon: "Mountain",
    description: "Mining, quarrying, and resource extraction",
  },
  TECHNOLOGY: {
    code: "TECHNOLOGY",
    name: "Technology",
    color: "#6366f1",
    icon: "Monitor",
    description: "Data centers, IT infrastructure, and digital services",
  },
  GENERAL: {
    code: "GENERAL",
    name: "General / Cross-sector",
    color: "#94a3b8",
    icon: "Globe",
    description: "Cross-sector emissions and activities",
  },
};

export const SECTOR_LIST = Object.values(SECTORS);
export const SECTOR_CODES = Object.keys(SECTORS) as SectorCode[];

export function getSectorColor(code: string): string {
  return SECTORS[code as SectorCode]?.color ?? "#94a3b8";
}

export function getSectorName(code: string): string {
  return SECTORS[code as SectorCode]?.name ?? code;
}
