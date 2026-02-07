export interface ClearingBid {
  id: string;
  bidderId: string;
  safCategory: string;
  quantity: number;
  maxPrice: number;
  allowSubstitution: boolean;
  categoryPreferences?: CategoryPreference[];
}

export interface ClearingAsk {
  id: string;
  producerId: string;
  safCategory: string;
  quantity: number;
  minPrice: number;
  facilityId?: string | null;
}

export interface CategoryPreference {
  category: string;
  quantity: number;
  maxPrice: number;
  priority: number;
}

export interface AllocationResult {
  bidId: string;
  askId: string;
  safCategory: string;
  quantity: number;
  pricePerGallon: number;
  totalPrice: number;
  vcgPayment?: number;
}

export interface ClearingResult {
  mechanism: "vickrey" | "vcg";
  allocations: AllocationResult[];
  totalVolume: number;
  totalValue: number;
  averagePrice: number;
  socialWelfare: number;
  revenueRatio: number;
  reserveMet: boolean;
  categoryResults: CategoryResult[];
}

export interface CategoryResult {
  category: string;
  volume: number;
  avgPrice: number;
  clearingPrice: number;
  bidCount: number;
  askCount: number;
}

export interface SubstitutionMatrix {
  [key: string]: number; // "HEFA->FT": 0.95
}
