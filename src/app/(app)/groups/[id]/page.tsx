"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProfileSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  attendanceRecords,
  courseById,
  exams,
  grades,
  groups,
  payments,
  scheduleEvents,
  students,
  teacherById,
} from "@/data";
import {
  formatDate,
  formatDateShort,
  formatPhone,
  formatUZS,
  fullName,
  initials,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function GroupDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { loading } = useMockLoading(450);

  const group = groups.find((g) => g.id === params.id);
  if (loading) return <ProfileSkeleton />;
  if (!group) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <ErrorState title={t.common.noResults} onRetry={() => router.push("/groups")} />
      </div>
    );
  }

  const course = courseById.get(group.courseId);
  const teacher = teacherById.get(group.teacherId);
  const groupStudents = students.filter((s) => s.groupId === group.id);
  const groupAttendance = attendanceRecords.filter((a) => a.groupId === group.id);
  const groupExams = exams.filter((e) => e.groupId === group.id);
  const groupPayments = payments.filter((p) => groupStudents.some((s) => s.id === p.studentId));
  const upcomingEvents = scheduleEvents
    .filter((e) => e.groupId === group.id && e.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 8);

  const avgAttendance = groupStudents.length
    ? Math.round(groupStudents.reduce((s, x) => s + x.attendanceRate, 0) / groupStudents.length)
    : 0;
  const avgPerformance = groupStudents.length
    ? Math.round(groupStudents.reduce((s, x) => s + x.performance, 0) / groupStudents.length)
    : 0;
  const totalDebt = groupStudents.reduce((s, x) => s + x.debt, 0);
  const fill = Math.round((groupStudents.length / group.capacity) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href="/groups">
          <ArrowLeft className="size-4" />
          {t.groups.title}
        </Link>
      </Button>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: `var(--${course?.color ?? "chart-1"})` }}
          >
            <GraduationCap className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{group.name}</h1>
              <StatusBadge
                status={group.status}
                label={
                  group.status === "active"
                    ? t.common.active
                    : group.status === "forming"
                      ? t.groups.forming
                      : t.groups.finished
                }
              />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {course?.name} ·{" "}
              {teacher ? (
                <Link href={`/teachers/${teacher.id}`} className="text-primary hover:underline">
                  {fullName(teacher)}
                </Link>
              ) : (
                "—"
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <DoorOpen className="size-3.5" /> {t.common.room} {group.room}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {group.schedule.days.map((d) => t.days[d]).join(", ")} · {group.schedule.startTime}–
                {group.schedule.endTime}
              </span>
              <span>
                {t.groups.startDate}: {formatDateShort(group.startDate)}
              </span>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
            {[
              { label: t.groups.fillRate, value: `${groupStudents.length}/${group.capacity}` },
              { label: t.attendance.rate, value: `${avgAttendance}%` },
              { label: t.students.profile.performance, value: `${avgPerformance}%` },
              { label: t.debts.totalDebt, value: totalDebt > 0 ? formatUZS(totalDebt, "") : "0" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="students">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="students">{t.groups.studentList}</TabsTrigger>
            <TabsTrigger value="schedule">{t.common.schedule}</TabsTrigger>
            <TabsTrigger value="attendance">{t.nav.attendance}</TabsTrigger>
            <TabsTrigger value="exams">{t.nav.exams}</TabsTrigger>
            <TabsTrigger value="payments">{t.nav.payments}</TabsTrigger>
          </TabsList>
        </div>

        {/* Students */}
        <TabsContent value="students" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="flex items-center justify-between px-5">
              <CardTitle className="text-sm">
                {t.groups.studentList} ({groupStudents.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Progress value={fill} className="h-1.5 w-24" />
                <span className="text-xs text-muted-foreground tabular-nums">{fill}%</span>
              </div>
            </CardHeader>
            <CardContent className="px-5">
              {groupStudents.length === 0 ? (
                <EmptyState icon={GraduationCap} title={t.students.empty} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {groupStudents.map((s) => (
                    <Link
                      key={s.id}
                      href={`/students/${s.id}`}
                      className="-mx-2 flex flex-wrap items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                          {initials(fullName(s))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{fullName(s)}</p>
                        <p className="text-xs text-muted-foreground">{formatPhone(s.phone)}</p>
                      </div>
                      <span
                        className={cn(
                          "w-12 text-right text-xs font-medium tabular-nums",
                          s.attendanceRate >= 90
                            ? "text-success"
                            : s.attendanceRate >= 80
                              ? "text-warning"
                              : "text-destructive"
                        )}
                      >
                        {s.attendanceRate}%
                      </span>
                      <StatusBadge
                        status={s.paymentStatus}
                        label={t.payments.status[s.paymentStatus]}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.dashboard.upcomingClasses}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {upcomingEvents.length === 0 ? (
                <EmptyState icon={CalendarDays} title={t.schedule.noClasses} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                      <div className="flex w-12 flex-col items-center rounded-md border bg-muted/40 py-1">
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {formatDate(e.date, "MMM")}
                        </span>
                        <span className="text-sm leading-none font-semibold">
                          {formatDate(e.date, "dd")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {formatDate(e.date, "EEEE")} · {e.startTime}–{e.endTime}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.common.room} {e.room}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance summary */}
        <TabsContent value="attendance" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.attendance.rate}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5">
                {groupStudents.map((s) => (
                  <div key={s.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate">{fullName(s)}</span>
                      <span className="font-medium tabular-nums">{s.attendanceRate}%</span>
                    </div>
                    <Progress value={s.attendanceRate} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.attendance.monthlyStats}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                {(["present", "late", "absent", "excused"] as const).map((status) => {
                  const count = groupAttendance.filter((a) => a.status === status).length;
                  const pct = groupAttendance.length
                    ? Math.round((count / groupAttendance.length) * 100)
                    : 0;
                  return (
                    <div key={status} className="flex items-center justify-between py-2">
                      <StatusBadge status={status} label={t.attendance[status]} />
                      <span className="text-sm tabular-nums">
                        {count} <span className="text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link href="/attendance">
                    <ClipboardCheck className="size-4" />
                    {t.attendance.title}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.nav.exams}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {groupExams.length === 0 ? (
                <EmptyState icon={TrendingUp} title={t.exams.empty} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {groupExams.map((e) => {
                    const examGrades = grades.filter((g) => g.examId === e.id);
                    const avg = examGrades.length
                      ? Math.round(
                          (examGrades.reduce((s, g) => s + g.score / g.maxScore, 0) /
                            examGrades.length) *
                            100
                        )
                      : null;
                    return (
                      <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                        </div>
                        {avg !== null && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {t.exams.avgScore}: <span className="font-semibold text-foreground">{avg}%</span>
                          </span>
                        )}
                        <StatusBadge
                          status={e.status}
                          label={
                            e.status === "graded"
                              ? t.exams.graded
                              : e.status === "upcoming"
                                ? t.exams.upcoming
                                : t.exams.inProgress
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.nav.payments}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {groupPayments.length === 0 ? (
                <EmptyState icon={CreditCard} title={t.payments.empty} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {groupPayments.slice(0, 15).map((p) => {
                    const s = students.find((x) => x.id === p.studentId);
                    return (
                      <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{s ? fullName(s) : "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.invoiceNo} · {formatDate(p.date)}
                          </p>
                        </div>
                        <StatusBadge status={p.status} label={t.payments.status[p.status]} />
                        <span className="w-28 text-right text-sm font-semibold tabular-nums">
                          {formatUZS(p.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
