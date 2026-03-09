"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSectorColor, getSectorName } from "@/lib/constants/sectors";
import {
  Users,
  Target,
  Loader2,
  RefreshCw,
  LogIn,
  LogOut,
  Calendar,
  Layers,
  TrendingUp,
  X,
} from "lucide-react";

interface Participant {
  id: string;
  userId: string;
  committedQuantity: number;
  allocatedQuantity: number;
  status: string;
  user: { id: string; name: string; company: string | null };
}

interface Pool {
  id: string;
  name: string;
  description: string | null;
  sectorCode: string;
  abatementTypeCode: string;
  targetQuantity: number;
  currentQuantity: number;
  maxPricePerUnit: number | null;
  status: string;
  deadline: string | null;
  createdAt: string;
  sector: { code: string; name: string; color: string };
  abatementType: { code: string; name: string };
  participants: Participant[];
  _count: { participants: number };
}

const STATUS_COLORS: Record<string, string> = {
  forming: "#3b82f6",
  active: "#22c55e",
  clearing: "#f59e0b",
  completed: "#8b5cf6",
  cancelled: "#ef4444",
};

export default function ConsumerPoolsPage() {
  const { data: session } = useSession();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [joinDialogPool, setJoinDialogPool] = useState<Pool | null>(null);
  const [joinQuantity, setJoinQuantity] = useState("");

  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pools");
      if (!res.ok) throw new Error("Failed to fetch pools");
      const data: Pool[] = await res.json();
      setPools(data);
    } catch {
      toast.error("Failed to load demand pools");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const userId = session?.user?.id;

  const myPools = pools.filter((p) =>
    p.participants.some(
      (part) => part.userId === userId && part.status !== "withdrawn"
    )
  );

  const availablePools = pools.filter(
    (p) =>
      (p.status === "forming" || p.status === "active") &&
      !p.participants.some(
        (part) => part.userId === userId && part.status !== "withdrawn"
      )
  );

  // Summary stats
  const totalCommitted = myPools.reduce((sum, p) => {
    const myPart = p.participants.find(
      (part) => part.userId === userId && part.status !== "withdrawn"
    );
    return sum + (myPart?.committedQuantity ?? 0);
  }, 0);

  const handleJoin = async () => {
    if (!joinDialogPool || !joinQuantity) return;

    const qty = parseFloat(joinQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    setActionLoading(joinDialogPool.id);
    try {
      const res = await fetch(`/api/pools/${joinDialogPool.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committedQuantity: qty }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Failed to join pool" }));
        throw new Error(error.error ?? "Failed to join pool");
      }

      toast.success("Successfully joined the demand pool", {
        description: `Committed ${qty.toLocaleString()} tCO2e to ${joinDialogPool.name}`,
      });
      setJoinDialogPool(null);
      setJoinQuantity("");
      fetchPools();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join pool");
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (poolId: string, poolName: string) => {
    setActionLoading(poolId);
    try {
      const res = await fetch(`/api/pools/${poolId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Failed to withdraw" }));
        throw new Error(error.error ?? "Failed to withdraw");
      }

      toast.success("Withdrawn from pool", {
        description: `You have left ${poolName}`,
      });
      fetchPools();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to withdraw from pool"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] ?? "#94a3b8";
    return (
      <Badge
        className="text-[10px] capitalize"
        style={{
          backgroundColor: `${color}20`,
          color,
          borderColor: `${color}40`,
        }}
      >
        {status}
      </Badge>
    );
  };

  const renderProgressBar = (current: number, target: number, sectorCode: string) => {
    const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const sectorColor = getSectorColor(sectorCode);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{current.toLocaleString()} tCO2e</span>
          <span>{target.toLocaleString()} tCO2e</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: sectorColor,
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          {pct.toFixed(0)}% filled
        </p>
      </div>
    );
  };

  const renderPoolCard = (pool: Pool, isMyPool: boolean) => {
    const myParticipant = pool.participants.find(
      (p) => p.userId === userId && p.status !== "withdrawn"
    );
    const activeParticipants = pool.participants.filter(
      (p) => p.status !== "withdrawn"
    ).length;
    const canWithdraw =
      isMyPool &&
      myParticipant?.status === "committed" &&
      (pool.status === "forming" || pool.status === "active");

    return (
      <div key={pool.id} className="rounded-xl border bg-card p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">{pool.name}</h3>
              {pool.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {pool.description}
                </p>
              )}
            </div>
            {renderStatusBadge(pool.status)}
          </div>

          {/* Sector badge */}
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getSectorColor(pool.sectorCode) }}
            />
            <span className="text-xs text-muted-foreground">
              {getSectorName(pool.sectorCode)}
            </span>
            <span className="text-xs text-muted-foreground">&bull;</span>
            <span className="text-xs text-muted-foreground">
              {pool.abatementType.name}
            </span>
          </div>

          {/* Progress bar */}
          {renderProgressBar(
            pool.currentQuantity,
            pool.targetQuantity,
            pool.sectorCode
          )}

          {/* Info row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{activeParticipants} participant{activeParticipants !== 1 ? "s" : ""}</span>
            </div>
            {pool.deadline && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(pool.deadline).toLocaleDateString()}</span>
              </div>
            )}
            {pool.maxPricePerUnit && (
              <div className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                <span>Max ${pool.maxPricePerUnit.toFixed(2)}/unit</span>
              </div>
            )}
          </div>

          {/* My commitment (for joined pools) */}
          {isMyPool && myParticipant && (
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Your Commitment</p>
              <p className="text-sm font-semibold tabular-nums">
                {myParticipant.committedQuantity.toLocaleString()} tCO2e
              </p>
              {myParticipant.allocatedQuantity > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allocated: {myParticipant.allocatedQuantity.toLocaleString()}{" "}
                  tCO2e
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {!isMyPool && (pool.status === "forming" || pool.status === "active") && (
              <Button
                size="sm"
                onClick={() => {
                  setJoinDialogPool(pool);
                  setJoinQuantity("");
                }}
                disabled={actionLoading === pool.id}
              >
                {actionLoading === pool.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Join Pool
              </Button>
            )}
            {canWithdraw && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWithdraw(pool.id, pool.name)}
                disabled={actionLoading === pool.id}
              >
                {actionLoading === pool.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Withdraw
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demand Pools</h1>
          <p className="text-sm text-muted-foreground">
            Join collective purchasing pools to aggregate demand for carbon
            abatement credits
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPools}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="text-xs">Pools Joined</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {myPools.length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Total Committed</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {totalCommitted.toLocaleString()} tCO2e
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs">Available Pools</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {availablePools.length}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <div className="h-5 w-3/4 rounded bg-secondary animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-secondary animate-pulse" />
              <div className="h-2 w-full rounded bg-secondary animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Available Pools */}
      {!loading && availablePools.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Available Pools</h2>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {availablePools.map((pool) => renderPoolCard(pool, false))}
          </div>
        </div>
      )}

      {/* My Pools */}
      {!loading && myPools.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Pools</h2>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {myPools.map((pool) => renderPoolCard(pool, true))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && pools.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No demand pools yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There are no active demand pools available. Check back later or
            contact an administrator.
          </p>
        </div>
      )}

      {/* Join Dialog Overlay */}
      {joinDialogPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Join Demand Pool</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJoinDialogPool(null);
                  setJoinQuantity("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{joinDialogPool.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: getSectorColor(
                        joinDialogPool.sectorCode
                      ),
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {getSectorName(joinDialogPool.sectorCode)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  Target: {joinDialogPool.targetQuantity.toLocaleString()} tCO2e
                </p>
                <p>
                  Current: {joinDialogPool.currentQuantity.toLocaleString()}{" "}
                  tCO2e
                </p>
                <p>
                  Remaining:{" "}
                  {(
                    joinDialogPool.targetQuantity -
                    joinDialogPool.currentQuantity
                  ).toLocaleString()}{" "}
                  tCO2e
                </p>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="joinQty">
                  Committed Quantity (tCO2e)
                </label>
                <input
                  id="joinQty"
                  type="number"
                  min="1"
                  step="any"
                  value={joinQuantity}
                  onChange={(e) => setJoinQuantity(e.target.value)}
                  placeholder="Enter quantity..."
                  className="mt-1 w-full rounded-md bg-secondary border border-border p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setJoinDialogPool(null);
                    setJoinQuantity("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleJoin}
                  disabled={
                    !joinQuantity ||
                    parseFloat(joinQuantity) <= 0 ||
                    actionLoading === joinDialogPool.id
                  }
                >
                  {actionLoading === joinDialogPool.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Confirm Join
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
