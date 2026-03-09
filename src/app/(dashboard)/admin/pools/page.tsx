"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SECTOR_LIST, getSectorColor, getSectorName } from "@/lib/constants/sectors";
import { ABATEMENT_TYPE_LIST } from "@/lib/constants/abatement-types";
import {
  Plus,
  Users,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  Link2,
  CheckCircle2,
  XCircle,
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
  auctionId: string | null;
  deadline: string | null;
  createdAt: string;
  sector: { code: string; name: string; color: string };
  abatementType: { code: string; name: string };
  participants: Participant[];
  _count: { participants: number };
}

interface Auction {
  id: string;
  title: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  forming: "#3b82f6",
  active: "#22c55e",
  clearing: "#f59e0b",
  completed: "#8b5cf6",
  cancelled: "#ef4444",
};

const selectClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

export default function AdminPoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [linkAuctionPoolId, setLinkAuctionPoolId] = useState<string | null>(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState("");

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSector, setFormSector] = useState("");
  const [formAbatementType, setFormAbatementType] = useState("");
  const [formTargetQuantity, setFormTargetQuantity] = useState("");
  const [formMaxPrice, setFormMaxPrice] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredAbatementTypes = formSector
    ? ABATEMENT_TYPE_LIST.filter((t) => t.sectorCode === formSector)
    : ABATEMENT_TYPE_LIST;

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

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch("/api/auctions");
      if (!res.ok) return;
      const data: Auction[] = await res.json();
      setAuctions(data);
    } catch {
      // Silent fail for auctions list
    }
  }, []);

  useEffect(() => {
    fetchPools();
    fetchAuctions();
  }, [fetchPools, fetchAuctions]);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormSector("");
    setFormAbatementType("");
    setFormTargetQuantity("");
    setFormMaxPrice("");
    setFormDeadline("");
  };

  const handleCreate = async () => {
    if (!formName || !formSector || !formAbatementType || !formTargetQuantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          sectorCode: formSector,
          abatementTypeCode: formAbatementType,
          targetQuantity: parseFloat(formTargetQuantity),
          maxPricePerUnit: formMaxPrice
            ? parseFloat(formMaxPrice)
            : undefined,
          deadline: formDeadline || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Failed to create pool" }));
        throw new Error(error.error ?? "Failed to create pool");
      }

      toast.success("Demand pool created successfully");
      setShowCreateForm(false);
      resetForm();
      fetchPools();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create pool"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (
    poolId: string,
    newStatus: string,
    label: string
  ) => {
    setActionLoading(poolId);
    try {
      const res = await fetch(`/api/pools/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: `Failed to ${label}` }));
        throw new Error(error.error ?? `Failed to ${label}`);
      }

      toast.success(`Pool ${label} successfully`);
      fetchPools();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLinkAuction = async () => {
    if (!linkAuctionPoolId || !selectedAuctionId) return;

    setActionLoading(linkAuctionPoolId);
    try {
      const res = await fetch(
        `/api/pools/${linkAuctionPoolId}/link-auction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auctionId: selectedAuctionId }),
        }
      );

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Failed to link auction" }));
        throw new Error(error.error ?? "Failed to link auction");
      }

      toast.success("Pool linked to auction and set to clearing");
      setLinkAuctionPoolId(null);
      setSelectedAuctionId("");
      fetchPools();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to link auction"
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
        <div className="h-2 w-full rounded-full bg-secondary">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: sectorColor }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>
            {current.toLocaleString()} / {target.toLocaleString()} tCO2e
          </span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Demand Pools</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage collective purchasing pools for carbon abatement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPools}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Pool
          </Button>
        </div>
      </div>

      {/* Create Pool Form Overlay */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Demand Pool</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium">
                  Pool Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Aviation SAF Pool Q1 2026"
                  className={`mt-1 ${selectClassName}`}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the purpose of this pool..."
                  rows={2}
                  className={`mt-1 ${selectClassName} resize-none`}
                />
              </div>

              {/* Sector */}
              <div>
                <label className="text-sm font-medium">
                  Sector <span className="text-destructive">*</span>
                </label>
                <select
                  value={formSector}
                  onChange={(e) => {
                    setFormSector(e.target.value);
                    setFormAbatementType("");
                  }}
                  className={`mt-1 ${selectClassName}`}
                >
                  <option value="">Select sector...</option>
                  {SECTOR_LIST.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Abatement Type */}
              <div>
                <label className="text-sm font-medium">
                  Abatement Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={formAbatementType}
                  onChange={(e) => setFormAbatementType(e.target.value)}
                  className={`mt-1 ${selectClassName}`}
                  disabled={!formSector}
                >
                  <option value="">
                    {formSector
                      ? "Select abatement type..."
                      : "Select a sector first"}
                  </option>
                  {filteredAbatementTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Quantity */}
              <div>
                <label className="text-sm font-medium">
                  Target Quantity (tCO2e){" "}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={formTargetQuantity}
                  onChange={(e) => setFormTargetQuantity(e.target.value)}
                  placeholder="e.g., 5000"
                  className={`mt-1 ${selectClassName}`}
                />
              </div>

              {/* Max Price Per Unit */}
              <div>
                <label className="text-sm font-medium">
                  Max Price per Unit ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formMaxPrice}
                  onChange={(e) => setFormMaxPrice(e.target.value)}
                  placeholder="Optional"
                  className={`mt-1 ${selectClassName}`}
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="text-sm font-medium">Deadline</label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className={`mt-1 ${selectClassName}`}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={
                    creating ||
                    !formName ||
                    !formSector ||
                    !formAbatementType ||
                    !formTargetQuantity
                  }
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Pool
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Auction Overlay */}
      {linkAuctionPoolId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Link to Auction</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLinkAuctionPoolId(null);
                  setSelectedAuctionId("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select an auction to link to this pool. The pool status will be
                set to &quot;clearing&quot;.
              </p>

              <select
                value={selectedAuctionId}
                onChange={(e) => setSelectedAuctionId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Select an auction...</option>
                {auctions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.status})
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLinkAuctionPoolId(null);
                    setSelectedAuctionId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleLinkAuction}
                  disabled={
                    !selectedAuctionId ||
                    actionLoading === linkAuctionPoolId
                  }
                >
                  {actionLoading === linkAuctionPoolId ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Link Auction
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <div className="h-5 w-1/3 rounded bg-secondary animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-secondary animate-pulse" />
              <div className="h-2 w-full rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Pool List */}
      {!loading && pools.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No demand pools</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a demand pool to start aggregating consumer demand.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Pool
          </Button>
        </div>
      )}

      {!loading &&
        pools.map((pool) => {
          const isExpanded = expandedId === pool.id;
          const activeParticipants = pool.participants.filter(
            (p) => p.status !== "withdrawn"
          );

          return (
            <div key={pool.id} className="rounded-xl border bg-card p-6">
              <div className="space-y-4">
                {/* Pool Header */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : pool.id)
                  }
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm">{pool.name}</h3>
                      {renderStatusBadge(pool.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: getSectorColor(pool.sectorCode),
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {getSectorName(pool.sectorCode)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &bull;
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {pool.abatementType.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &bull;
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Users className="mr-1 inline h-3 w-3" />
                        {activeParticipants.length} participant
                        {activeParticipants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {renderProgressBar(
                  pool.currentQuantity,
                  pool.targetQuantity,
                  pool.sectorCode
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {pool.status === "forming" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(pool.id, "active", "activated");
                      }}
                      disabled={actionLoading === pool.id}
                    >
                      {actionLoading === pool.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Activate
                    </Button>
                  )}
                  {pool.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinkAuctionPoolId(pool.id);
                      }}
                      disabled={actionLoading === pool.id}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Link to Auction
                    </Button>
                  )}
                  {pool.status === "clearing" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(pool.id, "completed", "completed");
                      }}
                      disabled={actionLoading === pool.id}
                    >
                      {actionLoading === pool.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Complete
                    </Button>
                  )}
                  {pool.status !== "completed" &&
                    pool.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(
                            pool.id,
                            "cancelled",
                            "cancelled"
                          );
                        }}
                        disabled={actionLoading === pool.id}
                      >
                        {actionLoading === pool.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Cancel
                      </Button>
                    )}
                </div>

                {/* Expanded: Participant Details */}
                {isExpanded && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-sm font-medium">Participants</h4>
                    {activeParticipants.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No participants yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pool.participants.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {p.user.name}
                              </p>
                              {p.user.company && (
                                <p className="text-xs text-muted-foreground">
                                  {p.user.company}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium tabular-nums">
                                {p.committedQuantity.toLocaleString()} tCO2e
                              </p>
                              <div className="flex items-center gap-2">
                                {p.allocatedQuantity > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Allocated:{" "}
                                    {p.allocatedQuantity.toLocaleString()}
                                  </span>
                                )}
                                <Badge
                                  className="text-[9px]"
                                  variant={
                                    p.status === "withdrawn"
                                      ? "destructive"
                                      : p.status === "allocated"
                                        ? "success"
                                        : "secondary"
                                  }
                                >
                                  {p.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pool metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Target
                        </p>
                        <p className="font-medium tabular-nums">
                          {pool.targetQuantity.toLocaleString()} tCO2e
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Current
                        </p>
                        <p className="font-medium tabular-nums">
                          {pool.currentQuantity.toLocaleString()} tCO2e
                        </p>
                      </div>
                      {pool.maxPricePerUnit && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Max Price
                          </p>
                          <p className="font-medium tabular-nums">
                            ${pool.maxPricePerUnit.toFixed(2)} / unit
                          </p>
                        </div>
                      )}
                      {pool.deadline && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Deadline
                          </p>
                          <p className="font-medium">
                            {new Date(pool.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Created
                        </p>
                        <p className="font-medium">
                          {new Date(pool.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {pool.auctionId && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Linked Auction
                          </p>
                          <p className="font-medium text-xs truncate">
                            {pool.auctionId}
                          </p>
                        </div>
                      )}
                    </div>

                    {pool.description && (
                      <div className="pt-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Description
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pool.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

      {/* Count */}
      {!loading && pools.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {pools.length} demand pool{pools.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
