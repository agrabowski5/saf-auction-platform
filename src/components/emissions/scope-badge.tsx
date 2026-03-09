import { cn } from "@/lib/utils";

const SCOPE_CONFIG: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "Scope 1", color: "#ef4444" },
  2: { label: "Scope 2", color: "#f59e0b" },
  3: { label: "Scope 3", color: "#3b82f6" },
};

interface ScopeBadgeProps {
  scope: 1 | 2 | 3;
  className?: string;
}

export function ScopeBadge({ scope, className }: ScopeBadgeProps) {
  const config = SCOPE_CONFIG[scope];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        className
      )}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
