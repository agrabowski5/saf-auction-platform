import { nanoid } from "nanoid";

export interface VerificationResult {
  verified: boolean;
  registryScheme: string;
  certNumber: string;
  details: {
    pathway: string;
    feedstock: string;
    ciScore: number;
    chainOfCustody: string;
    expiresAt: string;
  };
  message: string;
}

export function mockVerifyCertificate(
  registryScheme: string,
  certNumber: string
): VerificationResult {
  const isValid = !certNumber.startsWith("INVALID");

  if (!isValid) {
    return {
      verified: false,
      registryScheme,
      certNumber,
      details: { pathway: "", feedstock: "", ciScore: 0, chainOfCustody: "", expiresAt: "" },
      message: `Certificate ${certNumber} not found in ${registryScheme} registry`,
    };
  }

  const schemes: Record<string, () => VerificationResult["details"]> = {
    RSB: () => ({
      pathway: "HEFA",
      feedstock: "Used Cooking Oil",
      ciScore: 22.5,
      chainOfCustody: "mass_balance",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    ISCC: () => ({
      pathway: "FT",
      feedstock: "Municipal Solid Waste",
      ciScore: 14.2,
      chainOfCustody: "book_and_claim",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    Verra: () => ({
      pathway: "PtL",
      feedstock: "Direct Air Capture",
      ciScore: 5.8,
      chainOfCustody: "book_and_claim",
      expiresAt: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    GoldStandard: () => ({
      pathway: "AtJ",
      feedstock: "Cellulosic Ethanol",
      ciScore: 28.3,
      chainOfCustody: "mass_balance",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  };

  const detailsFn = schemes[registryScheme] ?? schemes.RSB;

  return {
    verified: true,
    registryScheme,
    certNumber,
    details: detailsFn!(),
    message: `Certificate ${certNumber} verified by ${registryScheme}`,
  };
}

export function generateCertNumber(prefix: string = "SAF"): string {
  return `${prefix}-${new Date().getFullYear()}-${nanoid(10).toUpperCase()}`;
}
