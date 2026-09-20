"use client";

import * as React from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Period = "d7" | "d30" | "m3" | "m6" | "y1";

export const periodDays: Record<Period, number> = {
  d7: 7,
  d30: 30,
  m3: 90,
  m6: 180,
  y1: 365,
};

interface PeriodTabsProps {
  value: Period;
  onChange: (p: Period) => void;
  options?: Period[];
  className?: string;
}

export function PeriodTabs({ value, onChange, options, className }: PeriodTabsProps) {
  const t = useT();
  const opts = options ?? (["d7", "d30", "m3", "m6", "y1"] as Period[]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5",
        className
      )}
      role="tablist"
    >
      {opts.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={value === p}
          onClick={() => onChange(p)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.periods[p]}
        </button>
      ))}
    </div>
  );
}
