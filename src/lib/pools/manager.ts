// Demand Pool management: aggregation, auction linking, allocation distribution

export type PoolStatus = "forming" | "active" | "clearing" | "completed" | "cancelled";

export const POOL_STATUS_CONFIG: Record<
  PoolStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  forming: {
    label: "Forming",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    description: "Accepting participant commitments",
  },
  active: {
    label: "Active",
    color: "#22c55e",
    bgColor: "#f0fdf4",
    description: "Pool is open and collecting demand",
  },
  clearing: {
    label: "Clearing",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    description: "Linked to auction, awaiting clearing",
  },
  completed: {
    label: "Completed",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    description: "Auction cleared, allocations distributed",
  },
  cancelled: {
    label: "Cancelled",
    color: "#ef4444",
    bgColor: "#fef2f2",
    description: "Pool cancelled — insufficient participation",
  },
};

export interface PoolParticipant {
  userId: string;
  committedQuantity: number;
  allocatedQuantity: number;
  status: string;
}

export interface PoolSummary {
  totalCommitted: number;
  participantCount: number;
  fillPercent: number;
  targetQuantity: number;
  averageCommitment: number;
}

// Calculate pool statistics
export function calculatePoolSummary(
  targetQuantity: number,
  participants: PoolParticipant[]
): PoolSummary {
  const activeParticipants = participants.filter((p) => p.status !== "withdrawn");
  const totalCommitted = activeParticipants.reduce((sum, p) => sum + p.committedQuantity, 0);
  const participantCount = activeParticipants.length;

  return {
    totalCommitted,
    participantCount,
    fillPercent: targetQuantity > 0 ? Math.min(100, (totalCommitted / targetQuantity) * 100) : 0,
    targetQuantity,
    averageCommitment: participantCount > 0 ? totalCommitted / participantCount : 0,
  };
}

// Check if pool has enough participation to proceed
export function canActivatePool(
  targetQuantity: number,
  participants: PoolParticipant[],
  minFillPercent: number = 50
): { canActivate: boolean; reason?: string } {
  const summary = calculatePoolSummary(targetQuantity, participants);

  if (summary.participantCount < 2) {
    return { canActivate: false, reason: "At least 2 participants required" };
  }
  if (summary.fillPercent < minFillPercent) {
    return {
      canActivate: false,
      reason: `Pool is only ${summary.fillPercent.toFixed(0)}% filled (minimum ${minFillPercent}%)`,
    };
  }
  return { canActivate: true };
}

// Distribute auction results proportionally to participants
export interface AllocationResult {
  userId: string;
  committedQuantity: number;
  allocatedQuantity: number;
  proportion: number;
  pricePerUnit: number;
  totalCost: number;
}

export function distributeAllocation(
  totalCleared: number,
  clearedPrice: number,
  participants: PoolParticipant[]
): AllocationResult[] {
  const active = participants.filter((p) => p.status !== "withdrawn");
  const totalCommitted = active.reduce((sum, p) => sum + p.committedQuantity, 0);

  if (totalCommitted === 0) return [];

  return active.map((p) => {
    const proportion = p.committedQuantity / totalCommitted;
    const allocated = Math.min(p.committedQuantity, totalCleared * proportion);

    return {
      userId: p.userId,
      committedQuantity: p.committedQuantity,
      allocatedQuantity: Math.round(allocated * 100) / 100,
      proportion,
      pricePerUnit: clearedPrice,
      totalCost: Math.round(allocated * clearedPrice * 100) / 100,
    };
  });
}

// Validate a join request
export function validateJoinRequest(
  pool: { status: string; targetQuantity: number; currentQuantity: number },
  requestedQuantity: number,
  existingParticipant: boolean
): { valid: boolean; error?: string } {
  if (pool.status !== "forming" && pool.status !== "active") {
    return { valid: false, error: "Pool is no longer accepting participants" };
  }
  if (existingParticipant) {
    return { valid: false, error: "Already a participant in this pool" };
  }
  if (requestedQuantity <= 0) {
    return { valid: false, error: "Quantity must be greater than 0" };
  }
  const remaining = pool.targetQuantity - pool.currentQuantity;
  if (requestedQuantity > remaining * 1.5) {
    return {
      valid: false,
      error: `Requested quantity exceeds remaining pool capacity (${remaining.toFixed(0)} tCO2e remaining)`,
    };
  }
  return { valid: true };
}

// Pool status transitions
const VALID_POOL_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
  forming: ["active", "cancelled"],
  active: ["clearing", "cancelled"],
  clearing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionPool(from: PoolStatus, to: PoolStatus): boolean {
  return VALID_POOL_TRANSITIONS[from]?.includes(to) ?? false;
}
