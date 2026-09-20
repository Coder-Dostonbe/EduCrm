"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Kanban,
  Star,
  Users,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n";
import {
  courseById,
  debts,
  groupById,
  groups,
  leads,
  payments,
  scheduleEvents,
  studentById,
  students,
  teacherById,
  teachers,
} from "@/data";
import {
  formatDate,
  formatPhone,
  formatUZS,
  fullName,
  initials,
} from "@/lib/format";
import type { Dict } from "@/translations";
import type { LeadStage } from "@/types";
import { cn } from "@/lib/utils";

function WidgetCard({
  title,
  icon: Icon,
  href,
  loading,
  empty,
  emptyTitle,
  emptyHint,
  children,
  index = 0,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  children: React.ReactNode;
  index?: number;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.04, ease: "easeOut" }}
      className="min-w-0"
    >
      <Card className="h-full gap-3 py-5">
        <CardHeader className="flex items-center justify-between px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
            <Link href={href}>
              {t.common.viewAll}
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : empty ? (
            <EmptyState
              icon={Icon}
              title={emptyTitle ?? t.common.noResults}
              description={emptyHint}
              className="border-0 py-8"
            />
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PersonRow({
  name,
  sub,
  right,
  href,
}: {
  name: string;
  sub: string;
  right?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <Avatar className="size-8">
        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      {right}
    </>
  );
  const cls =
    "flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/60";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function RecentStudentsWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const recent = React.useMemo(
    () =>
      [...students]
        .sort((a, b) => (a.enrollmentDate < b.enrollmentDate ? 1 : -1))
        .slice(0, 5),
    []
  );
  return (
    <WidgetCard
      title={t.dashboard.recentStudents}
      icon={GraduationCap}
      href="/students"
      loading={loading}
      empty={recent.length === 0}
      emptyTitle={t.students.empty}
      emptyHint={t.students.emptyHint}
      index={index}
    >
      <div className="space-y-1">
        {recent.map((s) => (
          <PersonRow
            key={s.id}
            name={fullName(s)}
            sub={`${courseById.get(s.courseId)?.name ?? ""} · ${formatDate(s.enrollmentDate)}`}
            href={`/students/${s.id}`}
            right={
              <StatusBadge status={s.status} label={t.students.status[s.status]} withDot={false} />
            }
          />
        ))}
      </div>
    </WidgetCard>
  );
}

export function RecentPaymentsWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const recent = payments.filter((p) => p.status === "paid").slice(0, 5);
  return (
    <WidgetCard
      title={t.dashboard.recentPayments}
      icon={CreditCard}
      href="/payments"
      loading={loading}
      empty={recent.length === 0}
      emptyTitle={t.payments.empty}
      emptyHint={t.payments.emptyHint}
      index={index}
    >
      <div className="space-y-1">
        {recent.map((p) => {
          const s = studentById.get(p.studentId);
          return (
            <PersonRow
              key={p.id}
              name={s ? fullName(s) : "—"}
              sub={`${p.invoiceNo} · ${formatDate(p.date)}`}
              right={
                <span className="text-[13px] font-semibold tabular-nums text-success">
                  +{formatUZS(p.amount)}
                </span>
              }
            />
          );
        })}
      </div>
    </WidgetCard>
  );
}

export function UpcomingClassesWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = scheduleEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? -1 : 1))
    .slice(0, 5);

  return (
    <WidgetCard
      title={t.dashboard.upcomingClasses}
      icon={CalendarDays}
      href="/schedule"
      loading={loading}
      empty={upcoming.length === 0}
      emptyTitle={t.schedule.noClasses}
      emptyHint={t.schedule.noClassesHint}
      index={index}
    >
      <div className="space-y-1">
        {upcoming.map((e) => {
          const g = groupById.get(e.groupId);
          const teacher = teacherById.get(e.teacherId);
          return (
            <div key={e.id} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
              <div className="flex w-12 flex-col items-center rounded-md border bg-muted/40 py-1">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {formatDate(e.date, "MMM")}
                </span>
                <span className="text-sm leading-none font-semibold">{formatDate(e.date, "dd")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{g?.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.startTime}–{e.endTime} · {teacher ? fullName(teacher) : ""}
                </p>
              </div>
              <span className="text-xs whitespace-nowrap text-muted-foreground">{e.room}</span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

export function DebtorsWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const top = [...debts].sort((a, b) => b.debt - a.debt).slice(0, 5);
  return (
    <WidgetCard
      title={t.dashboard.studentsWithDebts}
      icon={WalletMinimal}
      href="/debts"
      loading={loading}
      empty={top.length === 0}
      emptyTitle={t.debts.empty}
      emptyHint={t.debts.emptyHint}
      index={index}
    >
      <div className="space-y-1">
        {top.map((d) => {
          const s = studentById.get(d.studentId);
          if (!s) return null;
          return (
            <PersonRow
              key={d.studentId}
              name={fullName(s)}
              sub={formatPhone(s.phone)}
              href={`/students/${s.id}`}
              right={
                <div className="text-right">
                  <p className="text-[13px] font-semibold tabular-nums text-destructive">
                    {formatUZS(d.debt)}
                  </p>
                  {d.overdueDays > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {d.overdueDays} {t.debts.daysOverdue}
                    </p>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
    </WidgetCard>
  );
}

export function AttendanceOverviewWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const groupStats = groups
    .filter((g) => g.status === "active")
    .slice(0, 5)
    .map((g) => {
      const gs = students.filter((s) => s.groupId === g.id);
      const rate = gs.length
        ? Math.round(gs.reduce((sum, s) => sum + s.attendanceRate, 0) / gs.length)
        : 0;
      return { group: g, rate };
    })
    .sort((a, b) => b.rate - a.rate);

  return (
    <WidgetCard
      title={t.dashboard.attendanceOverview}
      icon={ClipboardCheck}
      href="/attendance"
      loading={loading}
      empty={groupStats.length === 0}
      emptyTitle={t.attendance.empty}
      index={index}
    >
      <div className="space-y-3.5">
        {groupStats.map(({ group, rate }) => (
          <div key={group.id}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="truncate font-medium">{group.name}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  rate >= 90 ? "text-success" : rate >= 80 ? "text-warning" : "text-destructive"
                )}
              >
                {rate}%
              </span>
            </div>
            <Progress value={rate} className="h-1.5" />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

export function TopTeachersWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const top = [...teachers]
    .filter((x) => x.status !== "inactive")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);
  return (
    <WidgetCard
      title={t.dashboard.topTeachers}
      icon={Users}
      href="/teachers"
      loading={loading}
      empty={top.length === 0}
      emptyTitle={t.teachers.empty}
      index={index}
    >
      <div className="space-y-1">
        {top.map((teacher, i) => (
          <PersonRow
            key={teacher.id}
            name={fullName(teacher)}
            sub={`${teacher.specialization} · ${teacher.studentCount} ${t.common.students}`}
            href={`/teachers/${teacher.id}`}
            right={
              <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums">
                {i === 0 && <span className="text-sm">🏆</span>}
                <Star className="size-3.5 fill-warning text-warning" />
                {teacher.rating.toFixed(1)}
              </span>
            }
          />
        ))}
      </div>
    </WidgetCard>
  );
}

export function LeadPipelineWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const stages: LeadStage[] = ["new", "contacted", "interested", "trial", "negotiation"];
  const counts = stages.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));
  const total = counts.reduce((s, c) => s + c.count, 0);
  const palette = ["bg-chart-1", "bg-chart-4", "bg-chart-2", "bg-chart-3", "bg-chart-5"];

  return (
    <WidgetCard
      title={t.dashboard.leadPipeline}
      icon={Kanban}
      href="/leads"
      loading={loading}
      empty={total === 0}
      emptyTitle={t.leads.emptyStage}
      index={index}
    >
      <div className="mb-4 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {counts.map((c, i) => (
          <div
            key={c.stage}
            className={cn("transition-all", palette[i])}
            style={{ width: `${total ? (c.count / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {counts.map((c, i) => (
          <div key={c.stage} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", palette[i])} />
              {t.leads.stages[c.stage]}
            </span>
            <span className="font-semibold tabular-nums">{c.count}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

export function TodaysScheduleWidget({ loading, index }: { loading?: boolean; index?: number }) {
  const t = useT();
  const today = format(new Date(), "yyyy-MM-dd");
  const events = scheduleEvents
    .filter((e) => e.date === today)
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
    .slice(0, 6);

  return (
    <WidgetCard
      title={t.dashboard.todaysSchedule}
      icon={CalendarDays}
      href="/schedule"
      loading={loading}
      empty={events.length === 0}
      emptyTitle={t.schedule.noClasses}
      emptyHint={t.schedule.noClassesHint}
      index={index}
    >
      <div className="space-y-1">
        {events.map((e) => {
          const g = groupById.get(e.groupId);
          const c = courseById.get(e.courseId);
          return (
            <div key={e.id} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
              <span className="w-11 shrink-0 text-[13px] font-semibold tabular-nums">
                {e.startTime}
              </span>
              <span
                className="h-7 w-1 shrink-0 rounded-full"
                style={{ background: `var(--${c?.color ?? "chart-1"})` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{g?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c?.name}</p>
              </div>
              <span className="text-xs whitespace-nowrap text-muted-foreground">{e.room}</span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

export type { Dict };
