"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  Minus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AttendanceCalendar } from "@/components/student/attendance-calendar";
import { useT } from "@/lib/i18n";
import { studentInsights, type Lesson } from "@/lib/student-insights";
import { formatDateShort, fullName } from "@/lib/format";
import type { AttendanceStatus, Course, Student } from "@/types";
import { cn } from "@/lib/utils";

/** The course page a student gets: their own timetable and register, instead
 *  of the roll of everyone enrolled and the commercial detail behind it. */
export function StudentCourseView({
  course,
  student,
}: {
  course: Course;
  student: Student;
}) {
  const t = useT();
  const insights = React.useMemo(() => studentInsights(student), [student]);
  const { group, teacher, lessons, pastLessons, upcomingLessons, counts, rate } = insights;

  const recentPast = [...pastLessons].reverse().slice(0, 8);
  const nextFew = upcomingLessons.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href="/courses">
          <ArrowLeft className="size-4" />
          {t.nav.myCourses}
        </Link>
      </Button>

      {/* Course header */}
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
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={UsersRound} label={t.study.myGroup} value={group?.name ?? "—"} />
          <Fact
            icon={UserRound}
            label={t.study.myTeacher}
            value={teacher ? fullName(teacher) : "—"}
          />
          <Fact icon={DoorOpen} label={t.study.room} value={group?.room ?? "—"} />
          <Fact
            icon={Clock}
            label={t.study.lessonTimes}
            value={
              group
                ? `${group.schedule.startTime}–${group.schedule.endTime}`
                : "—"
            }
          />
        </dl>

        {group ? (
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1.5 inline size-4 align-text-bottom" />
            {group.schedule.days.map((d) => t.days[d]).join(" · ")}
          </p>
        ) : null}
      </Card>

      {/* Attendance summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t.attendance.rate}
          value={`${rate}%`}
          tone="primary"
          progress={rate}
        />
        <SummaryCard
          label={t.study.attended}
          value={String(counts.present + counts.late)}
          tone="success"
        />
        <SummaryCard
          label={t.study.missed}
          value={String(counts.absent)}
          tone="destructive"
        />
        <SummaryCard
          label={t.study.lessonsTotal}
          value={String(lessons.length)}
          tone="muted"
        />
      </div>

      {/* Calendar */}
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">{t.study.attendanceCalendar}</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <AttendanceCalendar lessons={lessons} />
        </CardContent>
      </Card>

      {/* Lesson lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LessonList
          title={t.study.pastLessons}
          lessons={recentPast}
          empty={t.study.noPast}
          showStatus
        />
        <LessonList
          title={t.study.upcomingLessons}
          lessons={nextFew}
          empty={t.study.noUpcoming}
        />
      </div>

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
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}

const toneText = {
  primary: "text-primary",
  success: "text-success",
  destructive: "text-destructive",
  muted: "text-foreground",
} as const;

function SummaryCard({
  label,
  value,
  tone,
  progress,
}: {
  label: string;
  value: string;
  tone: keyof typeof toneText;
  progress?: number;
}) {
  return (
    <Card className="gap-2 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", toneText[tone])}>{value}</p>
      {progress !== undefined ? <Progress value={progress} className="h-1.5" /> : null}
    </Card>
  );
}

const statusStyle: Record<AttendanceStatus, { icon: typeof Check; className: string }> = {
  present: { icon: Check, className: "bg-success text-white" },
  late: { icon: Clock, className: "bg-warning text-white" },
  absent: { icon: X, className: "bg-destructive text-white" },
  excused: { icon: Minus, className: "bg-muted-foreground text-background" },
};

export function LessonList({
  title,
  lessons,
  empty,
  showStatus = false,
}: {
  title: string;
  lessons: Lesson[];
  empty: string;
  showStatus?: boolean;
}) {
  const t = useT();
  const statusLabel: Record<AttendanceStatus, string> = {
    present: t.attendance.present,
    late: t.attendance.late,
    absent: t.attendance.absent,
    excused: t.attendance.excused,
  };

  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {lessons.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {lessons.map((lesson) => {
              const style = lesson.status ? statusStyle[lesson.status] : null;
              const Icon = style?.icon;
              return (
                <li
                  key={lesson.event.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">
                      {formatDateShort(lesson.event.date)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {lesson.event.startTime}–{lesson.event.endTime} · {t.study.room}{" "}
                      {lesson.event.room}
                    </p>
                  </div>
                  {showStatus ? (
                    lesson.status && Icon && style ? (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full",
                            style.className
                          )}
                        >
                          <Icon className="size-3" strokeWidth={3} />
                        </span>
                        {statusLabel[lesson.status]}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t.study.notMarked}
                      </span>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
