// Book & Claim transaction lifecycle state machine
// States: registered → listed → purchased → claimed → retired
// Also: cancelled (from any state except retired)

export type BookClaimStatus =
  | "registered"
  | "listed"
  | "purchased"
  | "claimed"
  | "retired"
  | "cancelled";

export const BOOK_CLAIM_STATUSES: BookClaimStatus[] = [
  "registered",
  "listed",
  "purchased",
  "claimed",
  "retired",
  "cancelled",
];

export const LIFECYCLE_STAGES: BookClaimStatus[] = [
  "registered",
  "listed",
  "purchased",
  "claimed",
  "retired",
];

export interface StatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  step: number; // 0-4 for pipeline visualization
}

export const STATUS_CONFIG: Record<BookClaimStatus, StatusConfig> = {
  registered: {
    label: "Registered",
    description: "Abatement registered and verified by provider",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    step: 0,
  },
  listed: {
    label: "Listed",
    description: "Available for purchase on the marketplace",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    step: 1,
  },
  purchased: {
    label: "Purchased",
    description: "Bought by a company, payment confirmed",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    step: 2,
  },
  claimed: {
    label: "Claimed",
    description: "Environmental attributes claimed against emissions",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    step: 3,
  },
  retired: {
    label: "Retired",
    description: "Permanently retired, cannot be resold or reclaimed",
    color: "#22c55e",
    bgColor: "#f0fdf4",
    step: 4,
  },
  cancelled: {
    label: "Cancelled",
    description: "Transaction cancelled",
    color: "#ef4444",
    bgColor: "#fef2f2",
    step: -1,
  },
};

// Valid transitions
const VALID_TRANSITIONS: Record<BookClaimStatus, BookClaimStatus[]> = {
  registered: ["listed", "cancelled"],
  listed: ["purchased", "cancelled"],
  purchased: ["claimed", "cancelled"],
  claimed: ["retired"],
  retired: [],
  cancelled: [],
};

export function canTransition(from: BookClaimStatus, to: BookClaimStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(current: BookClaimStatus): BookClaimStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  timestampField?: string;
}

// Validate and return the timestamp field to update
export function validateTransition(
  from: BookClaimStatus,
  to: BookClaimStatus,
  context: {
    hasBuyer?: boolean;
    hasCertificate?: boolean;
    hasPrice?: boolean;
  } = {}
): TransitionResult {
  if (!canTransition(from, to)) {
    return {
      success: false,
      error: `Cannot transition from "${from}" to "${to}"`,
    };
  }

  // Context-specific validations
  if (to === "purchased" && !context.hasBuyer) {
    return { success: false, error: "A buyer must be assigned before purchasing" };
  }
  if (to === "purchased" && !context.hasPrice) {
    return { success: false, error: "Price must be set before purchasing" };
  }
  if (to === "claimed" && !context.hasCertificate) {
    return { success: false, error: "Certificate must be linked before claiming" };
  }

  const timestampFields: Record<string, string> = {
    listed: "listedAt",
    purchased: "purchasedAt",
    claimed: "claimedAt",
    retired: "retiredAt",
  };

  return {
    success: true,
    timestampField: timestampFields[to],
  };
}

// Calculate completion percentage for pipeline visualization
export function getLifecycleProgress(status: BookClaimStatus): number {
  const config = STATUS_CONFIG[status];
  if (!config || config.step < 0) return 0;
  return (config.step / 4) * 100;
}

// Summary stats for a collection of transactions
export interface TransactionSummary {
  total: number;
  byStatus: Record<BookClaimStatus, number>;
  totalQuantity: number;
  totalValue: number;
  retiredQuantity: number;
}

export function summarizeTransactions(
  transactions: { status: string; quantity: number; totalPrice?: number | null }[]
): TransactionSummary {
  const summary: TransactionSummary = {
    total: transactions.length,
    byStatus: {
      registered: 0,
      listed: 0,
      purchased: 0,
      claimed: 0,
      retired: 0,
      cancelled: 0,
    },
    totalQuantity: 0,
    totalValue: 0,
    retiredQuantity: 0,
  };

  for (const tx of transactions) {
    const status = tx.status as BookClaimStatus;
    summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1;
    summary.totalQuantity += tx.quantity;
    summary.totalValue += tx.totalPrice ?? 0;
    if (status === "retired") {
      summary.retiredQuantity += tx.quantity;
    }
  }

  return summary;
}
