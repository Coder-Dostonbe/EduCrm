"use client";

import * as React from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { enUS, ru as ruLocale, uz as uzLocale } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Award,
  CalendarClock,
  ClipboardCheck,
  DoorOpen,
  FileText,
  GraduationCap,
  UserRound,
  WalletMinimal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { StatCard } from "@/components/shared/stat-card";
import { AttendanceCalendar } from "@/components/student/attendance-calendar";
import { ChartSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { useI18n, useT } from "@/lib/i18n";
import { studentInsights } from "@/lib/student-insights";
import { formatDate, formatDateShort, formatUZS, fullName } from "@/lib/format";
import { exams } from "@/data";
import type { AttendanceStatus, Student } from "@/types";
import { cn } from "@/lib/utils";

/** The dashboard a student sees: their own attendance, marks and timetable.
 *  Staff keep the centre-wide KPIs and charts — none of which mean anything
 *  to one learner. */
export function StudentDashboard({
  student,
  loading,
}: {
  student: Student;
  loading?: boolean;
}) {
  const t = useT();
  const { language } = useI18n();
  const locale = language === "ru" ? ruLocale : language === "en" ? enUS : uzLocale;

  const insights = React.useMemo(() => studentInsights(student), [student]);
  const {
    group,
    teacher,
    lessons,
    counts,
    markedCount,
    rate,
    examResults,
    averagePercent,
    nextLesson,
    upcomingLessons,
    monthlyRate,
  } = insights;

  const upcomingExams = React.useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return exams
      .filter((e) => e.groupId === student.groupId && e.date >= today && e.status !== "graded")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [student.groupId]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard
          index={0}
          label={t.attendance.rate}
          value={`${rate}%`}
          icon={ClipboardCheck}
        />
        <StatCard
          index={1}
          label={t.exams.avgScore}
          value={averagePercent ? `${averagePercent}%` : "—"}
          icon={Award}
        />
        <StatCard
          index={2}
          label={t.dashboard.lessonsAttended}
          value={`${counts.present + counts.late}/${markedCount}`}
          icon={GraduationCap}
        />
        <StatCard
          index={3}
          label={t.students.profile.currentDebt}
          value={formatUZS(student.debt)}
          icon={WalletMinimal}
        />
      </div>

      {/* Next class — the one thing a student opens this page for. */}
      {nextLesson ? (
        <Card className="gap-4 overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-4 border-l-4 border-primary bg-primary/5 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12">
              <CalendarClock className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-primary uppercase">
                {t.study.nextLesson}
              </p>
              <p className="mt-0.5 text-lg font-semibold">
                <span className="capitalize">
                  {format(new Date(nextLesson.event.date), "EEEE, d MMMM", { locale })}
                </span>
                <span className="ml-2 tabular-nums">
                  {nextLesson.event.startTime}–{nextLesson.event.endTime}
                </span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {group ? (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="size-4" />
                    {group.name}
                  </span>
                ) : null}
                {teacher ? (
                  <span className="flex items-center gap-1.5">
                    <UserRound className="size-4" />
                    {fullName(teacher)}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  <DoorOpen className="size-4" />
                  {t.study.room} {nextLesson.event.room}
                </span>
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-sm">
              {countdownLabel(nextLesson.event.date, t)}
            </Badge>
          </div>
        </Card>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Attendance trend */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.study.attendanceTrend}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {loading ? (
              <ChartSkeleton />
            ) : monthlyRate.length < 2 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t.study.noPast}
              </p>
            ) : (
              <AttendanceTrend data={monthlyRate} label={t.attendance.rate} />
            )}
          </CardContent>
        </Card>

        {/* Attendance breakdown */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.dashboard.attendanceBreakdown}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 px-5">
            {markedCount === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t.study.noPast}
              </p>
            ) : (
              breakdownRows(t).map(({ status, label, bar }) => {
                const count = counts[status];
                const share = Math.round((count / markedCount) * 100);
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium tabular-nums">
                        {count}
                        <span className="ml-1.5 text-xs text-muted-foreground">{share}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", bar)}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">{t.study.attendanceCalendar}</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          {loading ? <TableSkeleton /> : <AttendanceCalendar lessons={lessons} />}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {/* Upcoming classes */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.study.upcomingLessons}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t.study.noUpcoming}
              </p>
            ) : (
              <ul className="divide-y">
                {upcomingLessons.slice(0, 5).map((lesson) => (
                  <li
                    key={lesson.event.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="tabular-nums">
                      {formatDateShort(lesson.event.date)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {lesson.event.startTime}–{lesson.event.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent grades */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.study.myGrades}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {examResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t.study.noGrades}
              </p>
            ) : (
              <ul className="space-y-3">
                {examResults.slice(0, 4).map((result) => (
                  <li key={result.exam.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{result.exam.name}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {result.score}/{result.maxScore}
                      </span>
                    </div>
                    <Progress value={result.percent} className="h-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming exams */}
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.dashboard.upcomingExams}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {upcomingExams.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t.dashboard.noExams}
              </p>
            ) : (
              <ul className="divide-y">
                {upcomingExams.map((exam) => (
                  <li key={exam.id} className="flex items-center gap-3 py-2.5">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{exam.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateShort(exam.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AttendanceTrend({
  data,
  label,
}: {
  data: { date: string; rate: number }[];
  label: string;
}) {
  const config = {
    rate: { label, color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 4 }}>
        <defs>
          <linearGradient id="studentAttendanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-rate)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-rate)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v: string) => formatDate(v, "MMM")}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v: number) => `${v}%`}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v), "MMMM yyyy")} />}
        />
        <Area
          dataKey="rate"
          type="monotone"
          stroke="var(--color-rate)"
          strokeWidth={2}
          fill="url(#studentAttendanceFill)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

function breakdownRows(t: ReturnType<typeof useT>) {
  return [
    { status: "present" as AttendanceStatus, label: t.attendance.present, bar: "bg-success" },
    { status: "late" as AttendanceStatus, label: t.attendance.late, bar: "bg-warning" },
    { status: "absent" as AttendanceStatus, label: t.attendance.absent, bar: "bg-destructive" },
    { status: "excused" as AttendanceStatus, label: t.attendance.excused, bar: "bg-muted-foreground" },
  ];
}

function countdownLabel(date: string, t: ReturnType<typeof useT>): string {
  const days = differenceInCalendarDays(new Date(date), new Date());
  if (days <= 0) return t.dashboard.today;
  if (days === 1) return t.dashboard.tomorrow;
  return `${days} ${t.dashboard.daysLeft}`;
}
