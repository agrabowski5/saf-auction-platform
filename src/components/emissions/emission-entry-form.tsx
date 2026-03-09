"use client";

import { useState, useEffect } from "react";
import { getCategoriesByScope, GHGScope } from "@/lib/constants/ghg-categories";
import { suggestSector } from "@/lib/emissions/sector-matcher";
import { SECTOR_LIST } from "@/lib/constants/sectors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface EmissionEntryFormProps {
  inventoryId: string;
  onSubmit: (entry: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const inputClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

const selectClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring";

export function EmissionEntryForm({
  inventoryId,
  onSubmit,
  onCancel,
  initialData,
}: EmissionEntryFormProps) {
  const [scope, setScope] = useState<GHGScope>(initialData?.scope ?? 1);
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId ?? "");
  const [sectorCode, setSectorCode] = useState<string>(initialData?.sectorCode ?? "GENERAL");
  const [description, setDescription] = useState<string>(initialData?.description ?? "");
  const [tco2e, setTco2e] = useState<string>(initialData?.tco2e?.toString() ?? "");
  const [activityData, setActivityData] = useState<string>(
    initialData?.activityData?.toString() ?? ""
  );
  const [activityUnit, setActivityUnit] = useState<string>(initialData?.activityUnit ?? "");
  const [emissionFactor, setEmissionFactor] = useState<string>(
    initialData?.emissionFactor?.toString() ?? ""
  );
  const [source, setSource] = useState<string>(initialData?.source ?? "");

  const categories = getCategoriesByScope(scope);

  // When scope changes, reset category if the current one doesn't belong to the new scope
  useEffect(() => {
    const match = categories.find((c) => c.id === categoryId);
    if (!match) {
      setCategoryId("");
    }
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // When category changes, suggest a sector
  useEffect(() => {
    if (categoryId) {
      const suggested = suggestSector(categoryId);
      setSectorCode(suggested);
    }
  }, [categoryId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tco2e || Number(tco2e) <= 0) return;

    const entry = {
      inventoryId,
      scope,
      categoryId: categoryId || undefined,
      sectorCode,
      description: description || undefined,
      tco2e: Number(tco2e),
      activityData: activityData ? Number(activityData) : undefined,
      activityUnit: activityUnit || undefined,
      emissionFactor: emissionFactor ? Number(emissionFactor) : undefined,
      source: source || undefined,
    };

    onSubmit(entry);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Scope */}
      <div className="space-y-1.5">
        <Label htmlFor="scope">Scope</Label>
        <select
          id="scope"
          className={selectClassName}
          value={scope}
          onChange={(e) => setScope(Number(e.target.value) as GHGScope)}
        >
          <option value={1}>Scope 1 -- Direct Emissions</option>
          <option value={2}>Scope 2 -- Indirect (Energy)</option>
          <option value={3}>Scope 3 -- Value Chain</option>
        </select>
      </div>

      {/* GHG Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">GHG Category</Label>
        <select
          id="category"
          className={selectClassName}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">-- Select category --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.scope === 3 ? `Cat. ${cat.number}: ` : ""}
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sector */}
      <div className="space-y-1.5">
        <Label htmlFor="sector">Sector</Label>
        <select
          id="sector"
          className={selectClassName}
          value={sectorCode}
          onChange={(e) => setSectorCode(e.target.value)}
        >
          {SECTOR_LIST.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        {categoryId && (
          <p className="text-[11px] text-muted-foreground">
            Auto-suggested from category. You can change this if needed.
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className={`${inputClassName} min-h-[72px] resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the emission source..."
          rows={3}
        />
      </div>

      {/* tCO2e */}
      <div className="space-y-1.5">
        <Label htmlFor="tco2e">
          tCO2e <span className="text-red-400">*</span>
        </Label>
        <input
          id="tco2e"
          type="number"
          className={inputClassName}
          value={tco2e}
          onChange={(e) => setTco2e(e.target.value)}
          placeholder="0.00"
          min="0"
          step="any"
          required
        />
      </div>

      {/* Activity data + unit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="activityData">Activity Data</Label>
          <input
            id="activityData"
            type="number"
            className={inputClassName}
            value={activityData}
            onChange={(e) => setActivityData(e.target.value)}
            placeholder="e.g. 1000"
            min="0"
            step="any"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activityUnit">Activity Unit</Label>
          <input
            id="activityUnit"
            type="text"
            className={inputClassName}
            value={activityUnit}
            onChange={(e) => setActivityUnit(e.target.value)}
            placeholder="e.g. kWh, litres"
          />
        </div>
      </div>

      {/* Emission factor */}
      <div className="space-y-1.5">
        <Label htmlFor="emissionFactor">Emission Factor</Label>
        <input
          id="emissionFactor"
          type="number"
          className={inputClassName}
          value={emissionFactor}
          onChange={(e) => setEmissionFactor(e.target.value)}
          placeholder="kgCO2e per unit"
          min="0"
          step="any"
        />
      </div>

      {/* Source */}
      <div className="space-y-1.5">
        <Label htmlFor="source">Source</Label>
        <input
          id="source"
          type="text"
          className={inputClassName}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. utility invoice, travel system"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Update Entry" : "Add Entry"}
        </Button>
      </div>
    </form>
  );
}
