"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { enUS, ru as ruLocale, uz as uzLocale } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Clock, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, useT } from "@/lib/i18n";
import type { Lesson } from "@/lib/student-insights";
import type { AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";

/** How each register entry reads at a glance. Present and absent carry the
 *  tick and the cross; late and excused stay deliberately quieter so the two
 *  states that matter are the two that stand out. */
const marks: Record<
  AttendanceStatus,
  { icon: typeof Check; cell: string; badge: string }
> = {
  present: {
    icon: Check,
    cell: "border-success/40 bg-success/10",
    badge: "bg-success text-white",
  },
  late: {
    icon: Clock,
    cell: "border-warning/40 bg-warning/10",
    badge: "bg-warning text-white",
  },
  absent: {
    icon: X,
    cell: "border-destructive/40 bg-destructive/10",
    badge: "bg-destructive text-white",
  },
  excused: {
    icon: Minus,
    cell: "border-border bg-muted",
    badge: "bg-muted-foreground text-background",
  },
};

const WEEK_STARTS_ON = 1; // Monday

export function AttendanceCalendar({ lessons }: { lessons: Lesson[] }) {
  const t = useT();
  const { language } = useI18n();
  const locale = language === "ru" ? ruLocale : language === "en" ? enUS : uzLocale;

  const statusLabel: Record<AttendanceStatus, string> = {
    present: t.attendance.present,
    late: t.attendance.late,
    absent: t.attendance.absent,
    excused: t.attendance.excused,
  };

  // Open on the month of the most recent class, which is where the marks are.
  const initialMonth = React.useMemo(() => {
    const last = [...lessons].reverse().find((l) => l.past) ?? lessons[0];
    return last ? startOfMonth(new Date(last.event.date)) : startOfMonth(new Date());
  }, [lessons]);
  const [month, setMonth] = React.useState(initialMonth);

  const byDate = React.useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const lesson of lessons) map.set(lesson.event.date, lesson);
    return map;
  }, [lessons]);

  const start = startOfMonth(month);
  const end = endOfMonth(month);

  // Pad to whole weeks so the grid lines up under the weekday headings.
  const leading = (start.getDay() - WEEK_STARTS_ON + 7) % 7;
  const trailing = (WEEK_STARTS_ON + 6 - end.getDay() + 7) % 7;
  const days = eachDayOfInterval({
    start: new Date(start.getTime() - leading * 86_400_000),
    end: new Date(end.getTime() + trailing * 86_400_000),
  });

  const weekdays = days.slice(0, 7).map((d) => format(d, "EEEEEE", { locale }));

  const inMonth = lessons.filter((l) => isSameMonth(new Date(l.event.date), month) && l.past);
  const attendedInMonth = inMonth.filter(
    (l) => l.status === "present" || l.status === "late"
  ).length;
  const missedInMonth = inMonth.filter((l) => l.status === "absent").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t.a11y.previous}
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">
            {format(month, "LLLL yyyy", { locale })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t.a11y.next}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.study.thisMonth}:{" "}
          <span className="font-medium text-success">
            {attendedInMonth} {t.study.attended.toLowerCase()}
          </span>
          {" · "}
          <span className="font-medium text-destructive">
            {missedInMonth} {t.study.missed.toLowerCase()}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((label, i) => (
          <div
            key={i}
            className="pb-1 text-center text-[11px] font-medium text-muted-foreground uppercase"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const lesson = byDate.get(key);
          const outside = !isSameMonth(day, month);
          const mark = lesson?.past && lesson.status ? marks[lesson.status] : null;
          const Icon = mark?.icon;

          return (
            <div
              key={key}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-md border border-transparent text-xs",
                outside && "opacity-35",
                lesson && !mark && "border-dashed border-border bg-muted/30",
                mark?.cell,
                isToday(day) && "ring-1 ring-primary ring-offset-1 ring-offset-background"
              )}
              title={
                lesson
                  ? `${format(day, "d MMM", { locale })} · ${lesson.event.startTime}–${lesson.event.endTime}${
                      lesson.status ? ` · ${statusLabel[lesson.status]}` : ""
                    }`
                  : undefined
              }
            >
              <span className={cn("tabular-nums", mark && "font-medium")}>
                {format(day, "d")}
              </span>
              {Icon ? (
                <span
                  className={cn(
                    "mt-0.5 flex size-4 items-center justify-center rounded-full",
                    mark.badge
                  )}
                >
                  <Icon className="size-3" strokeWidth={3} />
                </span>
              ) : (
                <span className="mt-0.5 size-4" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="font-medium">{t.study.legend}:</span>
        {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((status) => {
          const mark = marks[status];
          const Icon = mark.icon;
          return (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full",
                  mark.badge
                )}
              >
                <Icon className="size-3" strokeWidth={3} />
              </span>
              {statusLabel[status]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
