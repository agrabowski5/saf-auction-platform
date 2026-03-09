"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InventoryOption {
  id: string;
  year: number;
  status: string;
}

interface ParsedRow {
  scope: string;
  ghgCategory: string;
  sectorCode: string;
  description: string;
  tCO2e: string;
  source: string;
  _valid: boolean;
  _error?: string;
}

interface ImportResult {
  successCount: number;
  errorCount: number;
  errors?: string[];
}

const selectClassName =
  "w-full rounded-md bg-secondary border border-border p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring";

const EXPECTED_COLUMNS = [
  "scope",
  "ghgCategory",
  "sectorCode",
  "description",
  "tCO2e",
  "source",
];

export default function ImportEmissionsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inventories, setInventories] = useState<InventoryOption[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    async function loadInventories() {
      try {
        const res = await fetch("/api/emissions/inventories");
        if (res.ok) {
          const data = await res.json();
          const list: InventoryOption[] = data.inventories ?? data;
          setInventories(list);
          if (list.length > 0) setSelectedInventoryId(list[0].id);
        }
      } catch {
        toast.error("Failed to load inventories");
      } finally {
        setLoading(false);
      }
    }
    loadInventories();
  }, []);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setParseError(null);
    setParsedRows([]);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data || results.data.length === 0) {
          setParseError("CSV file is empty or could not be parsed.");
          return;
        }

        const headers = Object.keys(results.data[0] as Record<string, unknown>);
        const missing = EXPECTED_COLUMNS.filter(
          (col) => !headers.map((h) => h.trim().toLowerCase()).includes(col.toLowerCase())
        );

        if (missing.length > 0) {
          setParseError(
            `Missing required columns: ${missing.join(", ")}. Expected: ${EXPECTED_COLUMNS.join(", ")}`
          );
          return;
        }

        const rows: ParsedRow[] = (results.data as Record<string, string>[]).map(
          (raw) => {
            const scope = (raw.scope ?? "").trim();
            const tCO2e = (raw.tCO2e ?? "").trim();
            const scopeNum = Number(scope);
            const tCO2eNum = Number(tCO2e);

            let _valid = true;
            let _error: string | undefined;

            if (![1, 2, 3].includes(scopeNum)) {
              _valid = false;
              _error = "Invalid scope (must be 1, 2, or 3)";
            } else if (isNaN(tCO2eNum) || tCO2eNum <= 0) {
              _valid = false;
              _error = "Invalid tCO2e (must be a positive number)";
            }

            return {
              scope,
              ghgCategory: (raw.ghgCategory ?? "").trim(),
              sectorCode: (raw.sectorCode ?? "GENERAL").trim(),
              description: (raw.description ?? "").trim(),
              tCO2e,
              source: (raw.source ?? "").trim(),
              _valid,
              _error,
            };
          }
        );

        setParsedRows(rows);
      },
      error(err) {
        setParseError(`Parse error: ${err.message}`);
      },
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      processFile(file);
    } else {
      toast.error("Please drop a .csv file");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function clearFile() {
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (!selectedInventoryId || parsedRows.length === 0) return;

    const validRows = parsedRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/emissions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: selectedInventoryId,
          entries: validRows.map((r) => ({
            scope: Number(r.scope),
            ghgCategory: r.ghgCategory,
            sectorCode: r.sectorCode || "GENERAL",
            description: r.description,
            tCO2e: Number(r.tCO2e),
            source: r.source,
          })),
        }),
      });

      if (!res.ok) throw new Error("Import failed");

      const result = await res.json();
      setImportResult({
        successCount: result.successCount ?? validRows.length,
        errorCount: result.errorCount ?? parsedRows.length - validRows.length,
        errors: result.errors,
      });
      toast.success(
        `Imported ${result.successCount ?? validRows.length} entries`
      );
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsedRows.filter((r) => r._valid).length;
  const invalidCount = parsedRows.length - validCount;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-xl border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Emissions</h1>
          <p className="text-sm text-muted-foreground">
            Bulk import emission entries from a CSV file
          </p>
        </div>
        <Link href="/consumer/emissions">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Emissions
          </Button>
        </Link>
      </div>

      {/* Inventory selector */}
      <div className="rounded-xl border bg-card p-6">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Target Inventory
        </label>
        {inventories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inventories found.{" "}
            <Link
              href="/consumer/emissions"
              className="text-primary hover:underline"
            >
              Create one first
            </Link>
            .
          </p>
        ) : (
          <select
            className={selectClassName}
            value={selectedInventoryId}
            onChange={(e) => setSelectedInventoryId(e.target.value)}
          >
            {inventories.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.year} ({inv.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* File upload area */}
      <div className="rounded-xl border bg-card p-6">
        <label className="mb-3 block text-sm font-medium text-muted-foreground">
          CSV File
        </label>

        {!fileName ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <FileUp className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drag and drop your CSV here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Expected columns: {EXPECTED_COLUMNS.join(", ")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              {parsedRows.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {parsedRows.length} rows
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearFile}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {parseError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}
      </div>

      {/* Preview table */}
      {parsedRows.length > 0 && !importResult && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-sm font-medium">Preview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {validCount} valid, {invalidCount} invalid of {parsedRows.length}{" "}
                rows
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0 || !selectedInventoryId}
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import {validCount} Entries
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="p-3 text-left font-medium w-8">#</th>
                  <th className="p-3 text-left font-medium">Scope</th>
                  <th className="p-3 text-left font-medium">Category</th>
                  <th className="p-3 text-left font-medium">Sector</th>
                  <th className="p-3 text-left font-medium">Description</th>
                  <th className="p-3 text-right font-medium">tCO2e</th>
                  <th className="p-3 text-left font-medium">Source</th>
                  <th className="p-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition-colors ${
                      row._valid
                        ? "hover:bg-accent/30"
                        : "bg-red-500/5 text-red-400"
                    }`}
                  >
                    <td className="p-3 text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-3">{row.scope}</td>
                    <td className="p-3 text-xs">{row.ghgCategory || "--"}</td>
                    <td className="p-3 text-xs">{row.sectorCode || "--"}</td>
                    <td className="p-3 max-w-[180px] truncate text-xs">
                      {row.description || "--"}
                    </td>
                    <td className="p-3 text-right tabular-nums">{row.tCO2e}</td>
                    <td className="p-3 text-xs">{row.source || "--"}</td>
                    <td className="p-3">
                      {row._valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <span
                          className="text-[10px] text-red-400"
                          title={row._error}
                        >
                          {row._error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 100 && (
              <p className="border-t p-3 text-center text-xs text-muted-foreground">
                Showing first 100 of {parsedRows.length} rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <div>
              <h2 className="font-semibold">Import Complete</h2>
              <p className="text-sm text-muted-foreground">
                {importResult.successCount} entries imported successfully
                {importResult.errorCount > 0 &&
                  `, ${importResult.errorCount} rows skipped`}
              </p>
            </div>
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">
                  {err}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={clearFile}>
              Import Another File
            </Button>
            <Link href="/consumer/emissions">
              <Button>Back to Emissions</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
