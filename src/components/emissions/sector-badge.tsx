import { getSectorColor, getSectorName } from "@/lib/constants/sectors";
import { cn } from "@/lib/utils";

interface SectorBadgeProps {
  sectorCode: string;
  className?: string;
}

export function SectorBadge({ sectorCode, className }: SectorBadgeProps) {
  const color = getSectorColor(sectorCode);
  const name = getSectorName(sectorCode);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
