"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  Mail,
  Phone,
  Star,
  Users,
  Wallet,
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
  courseById,
  groups,
  salaries,
  scheduleEvents,
  students,
  teachers,
} from "@/data";
import {
  formatDate,
  formatPhone,
  formatUZS,
  fullName,
  initials,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TeacherProfilePage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { loading } = useMockLoading(500);

  const teacher = teachers.find((x) => x.id === params.id);

  if (loading) return <ProfileSkeleton />;
  if (!teacher) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <ErrorState title={t.common.noResults} onRetry={() => router.push("/teachers")} />
      </div>
    );
  }

  const myGroups = groups.filter((g) => g.teacherId === teacher.id);
  const myStudents = students.filter((s) => myGroups.some((g) => g.id === s.groupId));
  const mySalaries = salaries
    .filter((s) => s.employeeId === teacher.id)
    .sort((a, b) => (a.month < b.month ? 1 : -1));
  const myEvents = scheduleEvents
    .filter(
      (e) => e.teacherId === teacher.id && e.date >= new Date().toISOString().slice(0, 10)
    )
    .slice(0, 10);

  const avgPerformance = myStudents.length
    ? Math.round(myStudents.reduce((sum, s) => sum + s.performance, 0) / myStudents.length)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href="/teachers">
          <ArrowLeft className="size-4" />
          {t.teachers.title}
        </Link>
      </Button>

      {/* Header */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar className="size-16 border">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials(fullName(teacher))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{fullName(teacher)}</h1>
              <StatusBadge
                status={teacher.status}
                label={
                  teacher.status === "active"
                    ? t.common.active
                    : teacher.status === "vacation"
                      ? t.teachers.onVacation
                      : t.common.inactive
                }
              />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{teacher.specialization}</p>
            {teacher.bio && <p className="mt-2 max-w-lg text-sm text-muted-foreground">{teacher.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {formatPhone(teacher.phone)}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {teacher.email}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> {t.teachers.hired}:{" "}
                {formatDate(teacher.hireDate)}
              </span>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
            {[
              { label: t.teachers.groups, value: String(myGroups.length), icon: Users },
              { label: t.teachers.studentsCol, value: String(myStudents.length), icon: GraduationCap },
              { label: t.common.rating, value: teacher.rating.toFixed(1), icon: Star },
              { label: t.nav.attendance, value: `${teacher.attendanceRate}%`, icon: CalendarDays },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="overview">{t.teachers.profileTabs.overview}</TabsTrigger>
            <TabsTrigger value="groups">{t.teachers.profileTabs.groups}</TabsTrigger>
            <TabsTrigger value="schedule">{t.teachers.profileTabs.schedule}</TabsTrigger>
            <TabsTrigger value="salary">{t.teachers.profileTabs.salary}</TabsTrigger>
            <TabsTrigger value="performance">{t.teachers.profileTabs.performance}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.teachers.assignedGroups}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                {myGroups.length === 0 ? (
                  <EmptyState icon={Users} title={t.groups.empty} className="border-0 py-8" />
                ) : (
                  <div className="space-y-1">
                    {myGroups.map((g) => (
                      <Link
                        key={g.id}
                        href={`/groups/${g.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {courseById.get(g.courseId)?.name} · {g.schedule.days.map((d) => t.days[d]).join(", ")}{" "}
                            {g.schedule.startTime}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {g.studentIds.length}/{g.capacity}
                        </span>
                        <StatusBadge
                          status={g.status}
                          label={
                            g.status === "active"
                              ? t.common.active
                              : g.status === "forming"
                                ? t.groups.forming
                                : t.groups.finished
                          }
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.teachers.studentStats}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.students.profile.performance}</span>
                    <span className="font-semibold tabular-nums">{avgPerformance}%</span>
                  </div>
                  <Progress value={avgPerformance} className="h-2" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.attendance.rate}</span>
                    <span className="font-semibold tabular-nums">{teacher.attendanceRate}%</span>
                  </div>
                  <Progress value={teacher.attendanceRate} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{t.teachers.salary}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {formatUZS(teacher.baseSalary)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{t.teachers.studentsCol}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{myStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {myGroups.map((g) => {
              const c = courseById.get(g.courseId);
              const fill = Math.round((g.studentIds.length / g.capacity) * 100);
              return (
                <Link key={g.id} href={`/groups/${g.id}`}>
                  <Card className="h-full gap-3 p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{c?.name} · {t.common.room} {g.room}</p>
                      </div>
                      <StatusBadge
                        status={g.status}
                        label={g.status === "active" ? t.common.active : g.status === "forming" ? t.groups.forming : t.groups.finished}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.schedule.days.map((d) => t.days[d]).join(", ")} · {g.schedule.startTime}–{g.schedule.endTime}
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">{t.groups.fillRate}</span>
                        <span className="font-medium tabular-nums">
                          {g.studentIds.length}/{g.capacity}
                        </span>
                      </div>
                      <Progress value={fill} className="h-1.5" />
                    </div>
                  </Card>
                </Link>
              );
            })}
            {myGroups.length === 0 && (
              <EmptyState icon={Users} title={t.groups.empty} className="md:col-span-2" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.dashboard.upcomingClasses}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {myEvents.length === 0 ? (
                <EmptyState icon={CalendarDays} title={t.schedule.noClasses} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {myEvents.map((e) => {
                    const g = groups.find((x) => x.id === e.groupId);
                    return (
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
                          <p className="text-sm font-medium">{g?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.startTime}–{e.endTime} · {t.common.room} {e.room}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.teachers.salaryHistory}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {mySalaries.length === 0 ? (
                <EmptyState icon={Wallet} title={t.salaries.empty} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {mySalaries.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{formatDate(`${s.month}-01`, "MMMM yyyy")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.salaries.baseSalary}: {formatUZS(s.baseSalary)}
                          {s.bonus > 0 && ` · +${formatUZS(s.bonus)}`}
                          {s.deductions > 0 && ` · −${formatUZS(s.deductions)}`}
                        </p>
                      </div>
                      <StatusBadge
                        status={s.status}
                        label={s.status === "paid" ? t.payments.status.paid : t.payments.status.pending}
                      />
                      <span className="w-32 text-right text-sm font-semibold tabular-nums">
                        {formatUZS(s.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.exams.avgScore}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="space-y-3">
                  {myGroups.map((g) => {
                    const gs = students.filter((s) => s.groupId === g.id);
                    const avg = gs.length
                      ? Math.round(gs.reduce((sum, s) => sum + s.performance, 0) / gs.length)
                      : 0;
                    return (
                      <div key={g.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="truncate">{g.name}</span>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              avg >= 80 ? "text-success" : avg >= 65 ? "text-warning" : "text-destructive"
                            )}
                          >
                            {avg}%
                          </span>
                        </div>
                        <Progress value={avg} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.attendance.byGroup}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="space-y-3">
                  {myGroups.map((g) => {
                    const gs = students.filter((s) => s.groupId === g.id);
                    const avg = gs.length
                      ? Math.round(gs.reduce((sum, s) => sum + s.attendanceRate, 0) / gs.length)
                      : 0;
                    return (
                      <div key={g.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="truncate">{g.name}</span>
                          <span className="font-semibold tabular-nums">{avg}%</span>
                        </div>
                        <Progress value={avg} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
