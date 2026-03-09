"use client";

import { LIFECYCLE_STAGES, STATUS_CONFIG } from "@/lib/book-claim/lifecycle";
import type { BookClaimStatus } from "@/lib/book-claim/lifecycle";
import { cn } from "@/lib/utils";

interface LifecyclePipelineProps {
  currentStatus: string;
}

export function LifecyclePipeline({ currentStatus }: LifecyclePipelineProps) {
  const currentStep = STATUS_CONFIG[currentStatus as BookClaimStatus]?.step ?? -1;

  return (
    <div className="flex items-center justify-between w-full">
      {LIFECYCLE_STAGES.map((stage, index) => {
        const config = STATUS_CONFIG[stage];
        const stepIndex = config.step;
        const isPast = stepIndex < currentStep;
        const isCurrent = stepIndex === currentStep;
        const isFuture = stepIndex > currentStep;

        return (
          <div key={stage} className="flex items-center flex-1 last:flex-none">
            {/* Stage circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                  isCurrent && "ring-4 ring-opacity-30",
                  isFuture && "border-2 border-muted-foreground/30 text-muted-foreground/50 bg-transparent"
                )}
                style={{
                  backgroundColor: isPast || isCurrent ? config.color : undefined,
                  color: isPast || isCurrent ? "#ffffff" : undefined,
                  boxShadow: isCurrent
                    ? `0 0 12px ${config.color}40, 0 0 4px ${config.color}60`
                    : undefined,
                }}
              >
                {isPast ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{stepIndex + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  isCurrent && "font-semibold",
                  isFuture && "text-muted-foreground/50"
                )}
                style={{
                  color: isPast || isCurrent ? config.color : undefined,
                }}
              >
                {config.label}
              </span>
            </div>

            {/* Connecting line */}
            {index < LIFECYCLE_STAGES.length - 1 && (
              <div className="flex-1 mx-2 mt-[-18px]">
                <div
                  className={cn(
                    "h-0.5 w-full rounded-full transition-all",
                    isFuture
                      ? "bg-muted-foreground/20"
                      : ""
                  )}
                  style={{
                    backgroundColor:
                      stepIndex < currentStep
                        ? config.color
                        : stepIndex === currentStep
                          ? `${config.color}60`
                          : undefined,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
