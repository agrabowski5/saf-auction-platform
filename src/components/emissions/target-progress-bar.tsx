"use client";

interface TargetProgressBarProps {
  sectorCode: string;
  sectorName: string;
  color: string;
  targetReduction: number;
  currentReduction: number;
  totalEmissions: number;
}

export function TargetProgressBar({
  sectorName,
  color,
  targetReduction,
  currentReduction,
  totalEmissions,
}: TargetProgressBarProps) {
  const percentAchieved =
    targetReduction > 0
      ? Math.min(100, (currentReduction / targetReduction) * 100)
      : 0;

  return (
    <div className="space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-white">{sectorName}</span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {percentAchieved.toFixed(0)}% achieved
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#1e293b]">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentAchieved}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Numbers row */}
      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>
          {currentReduction.toLocaleString()} / {targetReduction.toLocaleString()} tCO2e reduced
        </span>
        <span>{totalEmissions.toLocaleString()} tCO2e total</span>
      </div>
    </div>
  );
}
