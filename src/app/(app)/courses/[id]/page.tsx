"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { ProfileSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { StudentCourseView } from "./student-view";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { courses, groups, students, teacherById } from "@/data";
import { formatUZS, fullName, initials } from "@/lib/format";

export default function CourseDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(450);

  const course = courses.find((c) => c.id === params.id);
  const asStudent = role === "student" ? studentForUser(user) : null;

  if (loading) return <ProfileSkeleton />;

  // A student gets their own course only, and sees their timetable and
  // register rather than the roll, the fees and every other group.
  if (asStudent) {
    if (!course || course.id !== asStudent.courseId) {
      return (
        <div className="mx-auto max-w-3xl py-10">
          <ErrorState title={t.common.noResults} onRetry={() => router.push("/courses")} />
        </div>
      );
    }
    return <StudentCourseView course={course} student={asStudent} />;
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <ErrorState title={t.common.noResults} onRetry={() => router.push("/courses")} />
      </div>
    );
  }

  const courseGroups = groups.filter((g) => g.courseId === course.id);
  const courseStudents = students.filter((s) => s.courseId === course.id);
  const courseTeachers = course.teacherIds
    .map((id) => teacherById.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href="/courses">
          <ArrowLeft className="size-4" />
          {t.courses.title}
        </Link>
      </Button>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: `var(--${course.color})` }}
          >
            <BookOpen className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{course.name}</h1>
              <Badge variant="secondary">{t.courses.categories[course.category]}</Badge>
              {course.status === "archived" && (
                <StatusBadge status="inactive" label={t.courses.archived} />
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
            {[
              { label: t.common.price, value: formatUZS(course.price), icon: Wallet },
              { label: t.common.duration, value: `${course.durationMonths} ${t.common.months}`, icon: Clock },
              { label: t.nav.students, value: String(courseStudents.length), icon: GraduationCap },
              { label: t.nav.groups, value: String(courseGroups.length), icon: UsersRound },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Curriculum */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.courses.curriculum}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <ol className="space-y-3">
              {course.curriculum.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Teachers */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.nav.teachers}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <div className="space-y-1">
              {courseTeachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/teachers/${teacher.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(fullName(teacher))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{fullName(teacher)}</p>
                    <p className="text-xs text-muted-foreground">{teacher.specialization}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ★ {teacher.rating.toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        <Card className="gap-2 py-5 lg:col-span-2">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.nav.groups}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {courseGroups.map((g) => {
                const teacher = teacherById.get(g.teacherId);
                const fill = Math.round((g.studentIds.length / g.capacity) * 100);
                return (
                  <Link key={g.id} href={`/groups/${g.id}`}>
                    <Card className="h-full gap-2.5 p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{g.name}</p>
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
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {teacher ? fullName(teacher) : "—"} · {t.common.room} {g.room}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.schedule.days.map((d) => t.days[d]).join(", ")} · {g.schedule.startTime}–{g.schedule.endTime}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={fill} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {g.studentIds.length}/{g.capacity}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
            {courseGroups.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.groups.empty}</p>
            )}
          </CardContent>
        </Card>

        {/* Students preview */}
        <Card className="gap-2 py-5 lg:col-span-2">
          <CardHeader className="flex items-center justify-between px-5">
            <CardTitle className="text-sm">{t.nav.students}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/students">{t.common.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-5">
            <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
              {courseStudents.slice(0, 12).map((s) => (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {initials(fullName(s))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{fullName(s)}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {s.attendanceRate}%
                  </span>
                </Link>
              ))}
            </div>
            {courseStudents.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Users className="size-4" />
                {t.students.empty}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
