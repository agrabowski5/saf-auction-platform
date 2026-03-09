"use client";

import { useEffect, useState } from "react";
import { Target, Plus, Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/emissions/progress-ring";
import { TargetProgressBar } from "@/components/emissions/target-progress-bar";
import { SECTOR_LIST } from "@/lib/constants/sectors";

interface AbatementTarget {
  id: string;
  sectorCode: string;
  sectorName: string;
  color: string;
  year: number;
  targetReduction: number;
  currentReduction: number;
  totalEmissions: number;
}

interface TargetProgress {
  overallTargetTCO2e: number;
  overallAchievedTCO2e: number;
  overallRemainingTCO2e: number;
  overallPercent: number;
}

const inputClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

const selectClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring";

export default function TargetsPage() {
  const [targets, setTargets] = useState<AbatementTarget[]>([]);
  const [progress, setProgress] = useState<TargetProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Add target form
  const [showForm, setShowForm] = useState(false);
  const [formSector, setFormSector] = useState<string>(SECTOR_LIST[0]?.code ?? "");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formTarget, setFormTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [targetsRes, progressRes] = await Promise.all([
          fetch("/api/targets"),
          fetch("/api/targets/progress"),
        ]);
        if (targetsRes.ok) {
          const data = await targetsRes.json();
          setTargets(data.targets ?? data);
        }
        if (progressRes.ok) {
          const data = await progressRes.json();
          setProgress(data);
        }
      } catch {
        toast.error("Failed to load targets data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAddTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!formTarget || Number(formTarget) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorCode: formSector,
          year: Number(formYear),
          targetReduction: Number(formTarget),
        }),
      });
      if (!res.ok) throw new Error("Failed to create target");
      const created = await res.json();

      const sector = SECTOR_LIST.find((s) => s.code === formSector);
      const newTarget: AbatementTarget = {
        id: created.id,
        sectorCode: formSector,
        sectorName: sector?.name ?? formSector,
        color: sector?.color ?? "#94a3b8",
        year: Number(formYear),
        targetReduction: Number(formTarget),
        currentReduction: created.currentReduction ?? 0,
        totalEmissions: created.totalEmissions ?? 0,
      };

      setTargets((prev) => [...prev, newTarget]);
      toast.success("Abatement target added");
      setFormTarget("");
      setShowForm(false);

      // Refresh progress
      const progressRes = await fetch("/api/targets/progress");
      if (progressRes.ok) setProgress(await progressRes.json());
    } catch {
      toast.error("Failed to create target");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInlineEdit(targetId: string) {
    if (!editValue || Number(editValue) <= 0) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/targets/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetReduction: Number(editValue) }),
      });
      if (!res.ok) throw new Error("Failed to update target");

      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? { ...t, targetReduction: Number(editValue) }
            : t
        )
      );
      toast.success("Target updated");

      // Refresh progress
      const progressRes = await fetch("/api/targets/progress");
      if (progressRes.ok) setProgress(await progressRes.json());
    } catch {
      toast.error("Failed to update target");
    } finally {
      setEditingId(null);
    }
  }

  function startEditing(target: AbatementTarget) {
    setEditingId(target.id);
    setEditValue(target.targetReduction.toString());
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-40 rounded-xl border bg-card animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const overallPercent = progress?.overallPercent ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abatement Targets</h1>
          <p className="text-sm text-muted-foreground">
            Set and track emission reduction targets by sector
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Target
        </Button>
      </div>

      {/* Overall progress summary */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing
            percent={overallPercent}
            size={140}
            strokeWidth={10}
            color={overallPercent >= 100 ? "#22c55e" : "#3b82f6"}
            label="Overall Progress"
          />
          <div className="flex-1 space-y-3">
            <h2 className="text-lg font-semibold">Reduction Progress</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Target</p>
                <p className="text-xl font-bold tabular-nums">
                  {(progress?.overallTargetTCO2e ?? 0).toLocaleString()} tCO2e
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Achieved</p>
                <p className="text-xl font-bold tabular-nums text-green-400">
                  {(progress?.overallAchievedTCO2e ?? 0).toLocaleString()} tCO2e
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-xl font-bold tabular-nums text-amber-400">
                  {(progress?.overallRemainingTCO2e ?? 0).toLocaleString()} tCO2e
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add target form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            New Abatement Target
          </h2>
          <form onSubmit={handleAddTarget} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sector</label>
                <select
                  className={selectClassName}
                  value={formSector}
                  onChange={(e) => setFormSector(e.target.value)}
                >
                  {SECTOR_LIST.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Year</label>
                <input
                  type="number"
                  className={inputClassName}
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  min={new Date().getFullYear()}
                  max={2050}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Target Reduction (tCO2e)
                </label>
                <input
                  type="number"
                  className={inputClassName}
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="any"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Target
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Sector targets */}
      {targets.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Target className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No abatement targets set yet. Add targets to track your reduction
            progress by sector.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {targets.map((target) => {
            const gap = Math.max(
              0,
              target.targetReduction - target.currentReduction
            );
            const isEditing = editingId === target.id;

            return (
              <div
                key={target.id}
                className="rounded-xl border bg-card p-6 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {target.year}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      Target:{" "}
                      {isEditing ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            className="w-24 rounded border border-border bg-secondary px-2 py-0.5 text-sm text-white"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleInlineEdit(target.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <button
                            className="text-green-400 hover:text-green-300"
                            onClick={() => handleInlineEdit(target.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-white"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 text-white hover:text-primary transition-colors"
                          onClick={() => startEditing(target)}
                        >
                          {target.targetReduction.toLocaleString()} tCO2e
                          <Pencil className="h-2.5 w-2.5 opacity-50" />
                        </button>
                      )}
                    </span>
                  </div>
                  {gap > 0 && (
                    <p className="text-xs text-amber-400">
                      Gap: {gap.toLocaleString()} tCO2e -- consider SAF
                      certificates for {target.sectorName.toLowerCase()}{" "}
                      abatement
                    </p>
                  )}
                </div>

                <TargetProgressBar
                  sectorCode={target.sectorCode}
                  sectorName={target.sectorName}
                  color={target.color}
                  targetReduction={target.targetReduction}
                  currentReduction={target.currentReduction}
                  totalEmissions={target.totalEmissions}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
