"use client";

import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "neutral" | "primary";

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
};

const dotClasses: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
};

/** Map of known status values to tones, shared across modules. */
export const statusTone: Record<string, Tone> = {
  // generic
  active: "success",
  inactive: "neutral",
  // students
  graduated: "info",
  suspended: "warning",
  // payments
  paid: "success",
  pending: "warning",
  partial: "info",
  overdue: "destructive",
  cancelled: "neutral",
  // groups
  forming: "info",
  finished: "neutral",
  // attendance
  present: "success",
  absent: "destructive",
  late: "warning",
  excused: "info",
  // exams
  upcoming: "info",
  "in-progress": "warning",
  graded: "success",
  // teacher
  vacation: "info",
  // leads
  high: "destructive",
  medium: "warning",
  low: "neutral",
  // messages
  sent: "info",
  delivered: "success",
  failed: "destructive",
  scheduled: "warning",
};

interface StatusBadgeProps {
  /** Localized label to display */
  label: string;
  /** Raw status value used to pick the color */
  status: string;
  withDot?: boolean;
  className?: string;
}

export function StatusBadge({ label, status, withDot = true, className }: StatusBadgeProps) {
  const tone = statusTone[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />}
      {label}
    </span>
  );
}
