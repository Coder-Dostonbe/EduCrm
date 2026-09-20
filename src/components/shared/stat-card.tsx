"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** percentage change vs previous period */
  change?: number;
  changeLabel?: string;
  /** when true, a NEGATIVE change is good (e.g. debts going down) */
  invertTrend?: boolean;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel,
  invertTrend = false,
  index = 0,
}: StatCardProps) {
  const positive = change !== undefined && (invertTrend ? change < 0 : change > 0);
  const negative = change !== undefined && (invertTrend ? change > 0 : change < 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
    >
      <Card className="group gap-0 p-5 transition-shadow duration-200 hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
            <Icon className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {change !== undefined ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
                positive && "bg-success/10 text-success",
                negative && "bg-destructive/10 text-destructive",
                !positive && !negative && "bg-muted text-muted-foreground"
              )}
            >
              {change > 0 ? (
                <TrendingUp className="size-3" />
              ) : change < 0 ? (
                <TrendingDown className="size-3" />
              ) : null}
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            {changeLabel ? (
              <span className="truncate text-muted-foreground">{changeLabel}</span>
            ) : null}
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
