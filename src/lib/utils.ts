import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatGallons(gallons: number): string {
  if (gallons >= 1_000_000) return `${(gallons / 1_000_000).toFixed(1)}M gal`;
  if (gallons >= 1_000) return `${(gallons / 1_000).toFixed(0)}K gal`;
  return `${gallons.toLocaleString()} gal`;
}

export function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function parseJsonObject<T = Record<string, unknown>>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
