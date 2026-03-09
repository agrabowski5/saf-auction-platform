"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  label,
}: ProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, animatedPercent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  useEffect(() => {
    // Trigger animation on mount / percent change
    const timeout = setTimeout(() => {
      setAnimatedPercent(percent);
    }, 50);
    return () => clearTimeout(timeout);
  }, [percent]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">
            {Math.round(percent)}%
          </span>
        </div>
      </div>

      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
