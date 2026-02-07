export interface ComplianceScheme {
  code: string;
  name: string;
  region: string;
  description: string;
  certTypes: string[];
}

export const COMPLIANCE_SCHEMES: Record<string, ComplianceScheme> = {
  CORSIA: {
    code: "CORSIA",
    name: "Carbon Offsetting and Reduction Scheme for International Aviation",
    region: "International (ICAO)",
    description: "Mandatory scheme for international aviation emissions from 2027",
    certTypes: ["CORSIA_CEF"],
  },
  EU_ETS: {
    code: "EU_ETS",
    name: "EU Emissions Trading System",
    region: "European Union",
    description: "Cap-and-trade system covering EU aviation emissions",
    certTypes: ["EU_ETS"],
  },
  RFS: {
    code: "RFS",
    name: "Renewable Fuel Standard",
    region: "United States (Federal)",
    description: "EPA program requiring renewable fuel blending via RINs",
    certTypes: ["RIN"],
  },
  LCFS: {
    code: "LCFS",
    name: "Low Carbon Fuel Standard",
    region: "California, USA",
    description: "CARB program for reducing transportation fuel carbon intensity",
    certTypes: ["LCFS"],
  },
};

export const REGISTRY_SCHEMES = {
  RSB: { code: "RSB", name: "Roundtable on Sustainable Biomaterials" },
  ISCC: { code: "ISCC", name: "International Sustainability & Carbon Certification" },
  Verra: { code: "Verra", name: "Verra (Verified Carbon Standard)" },
  GoldStandard: { code: "GoldStandard", name: "Gold Standard" },
};

export const CERT_TYPES = ["RIN", "LCFS", "REC", "CORSIA_CEF", "EU_ETS"] as const;
export type CertType = (typeof CERT_TYPES)[number];

export const CHAIN_OF_CUSTODY_TYPES = ["mass_balance", "book_and_claim"] as const;
export type ChainOfCustodyType = (typeof CHAIN_OF_CUSTODY_TYPES)[number];
