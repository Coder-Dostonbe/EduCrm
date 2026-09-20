"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Upload,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProfileSkeleton } from "@/components/shared/skeletons";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  activities,
  attendanceRecords,
  courseById,
  exams,
  grades,
  groupById,
  payments,
  scheduleEvents,
  students,
  teacherById,
} from "@/data";
import {
  ageFromDob,
  formatDate,
  formatDateShort,
  formatPhone,
  formatUZS,
  fullName,
  initials,
} from "@/lib/format";
import type { ActivityType } from "@/types";
import { cn } from "@/lib/utils";

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

const activityIcon: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  payment: CreditCard,
  attendance: ClipboardCheck,
  "group-change": ArrowRightLeft,
  grade: TrendingUp,
  note: FileText,
  enrollment: GraduationCap,
  status: BadgeCheck,
};

export default function StudentProfilePage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { loading } = useMockLoading(500);
  const [paymentOpen, setPaymentOpen] = React.useState(false);

  const student = students.find((s) => s.id === params.id);

  if (loading) return <ProfileSkeleton />;

  if (!student) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <ErrorState
          title={t.common.noResults}
          description={t.common.errorHint}
          onRetry={() => router.push("/students")}
        />
      </div>
    );
  }

  const course = courseById.get(student.courseId);
  const group = groupById.get(student.groupId);
  const teacher = group ? teacherById.get(group.teacherId) : undefined;

  const myAttendance = attendanceRecords
    .filter((a) => a.studentId === student.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const myPayments = payments.filter((p) => p.studentId === student.id);
  const myGrades = grades.filter((g) => g.studentId === student.id);
  const myExams = exams.filter((e) => e.groupId === student.groupId);
  const myEvents = scheduleEvents
    .filter((e) => e.groupId === student.groupId && e.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 10);
  const myActivity = activities.filter((a) => a.studentId === student.id);

  const attendanceCounts = {
    present: myAttendance.filter((a) => a.status === "present").length,
    late: myAttendance.filter((a) => a.status === "late").length,
    absent: myAttendance.filter((a) => a.status === "absent").length,
    excused: myAttendance.filter((a) => a.status === "excused").length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href="/students">
          <ArrowLeft className="size-4" />
          {t.students.title}
        </Link>
      </Button>

      {/* Header */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar className="size-16 border">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials(fullName(student))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{fullName(student)}</h1>
              <StatusBadge status={student.status} label={t.students.status[student.status]} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t.students.profile.studentId}: {student.id.toUpperCase()} · {course?.name} ·{" "}
              {group?.name}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <CreditCard className="size-4" />
                {t.students.actions.payment}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/attendance">
                  <ClipboardCheck className="size-4" />
                  {t.students.actions.attendance}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/communications">
                  <Mail className="size-4" />
                  {t.communications.compose}
                </Link>
              </Button>
            </div>
          </div>
          {/* Quick stats */}
          <div className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:min-w-80">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  student.attendanceRate >= 90 ? "text-success" : student.attendanceRate >= 80 ? "text-warning" : "text-destructive"
                )}
              >
                {student.attendanceRate}%
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t.attendance.rate}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-lg font-semibold tabular-nums">{student.performance}%</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t.students.profile.performance}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  student.debt > 0 ? "text-destructive" : "text-success"
                )}
              >
                {student.debt > 0 ? formatUZS(student.debt, "") : "0"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t.students.profile.currentDebt}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="overview">{t.students.profile.tabs.overview}</TabsTrigger>
            <TabsTrigger value="attendance">{t.students.profile.tabs.attendance}</TabsTrigger>
            <TabsTrigger value="payments">{t.students.profile.tabs.payments}</TabsTrigger>
            <TabsTrigger value="grades">{t.students.profile.tabs.grades}</TabsTrigger>
            <TabsTrigger value="exams">{t.students.profile.tabs.exams}</TabsTrigger>
            <TabsTrigger value="schedule">{t.students.profile.tabs.schedule}</TabsTrigger>
            <TabsTrigger value="documents">{t.students.profile.tabs.documents}</TabsTrigger>
            <TabsTrigger value="activity">{t.students.profile.tabs.activity}</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.students.profile.personalInfo}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-5">
                <InfoRow icon={UserRound} label={t.students.form.firstName} value={fullName(student)} />
                <InfoRow
                  icon={CalendarDays}
                  label={t.students.form.dateOfBirth}
                  value={`${formatDateShort(student.dateOfBirth)} (${ageFromDob(student.dateOfBirth)})`}
                />
                <InfoRow
                  label={t.students.form.gender}
                  value={student.gender === "male" ? t.students.form.male : t.students.form.female}
                />
                <InfoRow icon={MapPin} label={t.students.form.address} value={student.address} />
              </CardContent>
            </Card>

            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.students.profile.contactInfo}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-5">
                <InfoRow icon={Phone} label={t.common.phone} value={formatPhone(student.phone)} />
                <InfoRow icon={Mail} label={t.common.email} value={student.email} />
                <InfoRow label={t.students.form.parentName} value={student.parentName} />
                <InfoRow
                  label={t.students.form.parentPhone}
                  value={formatPhone(student.parentPhone)}
                />
              </CardContent>
            </Card>

            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.students.profile.educationInfo}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-5">
                <InfoRow icon={GraduationCap} label={t.common.course} value={course?.name} />
                <InfoRow
                  label={t.common.group}
                  value={
                    group ? (
                      <Link href={`/groups/${group.id}`} className="text-primary hover:underline">
                        {group.name}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoRow
                  label={t.common.teacher}
                  value={
                    teacher ? (
                      <Link href={`/teachers/${teacher.id}`} className="text-primary hover:underline">
                        {fullName(teacher)}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoRow
                  icon={CalendarDays}
                  label={t.students.profile.enrolledOn}
                  value={formatDate(student.enrollmentDate)}
                />
              </CardContent>
            </Card>

            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.nav.payments}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-5">
                <InfoRow
                  icon={Wallet}
                  label={t.students.form.monthlyFee}
                  value={formatUZS(student.monthlyFee)}
                />
                <InfoRow
                  label={t.students.columns.payment}
                  value={
                    <StatusBadge
                      status={student.paymentStatus}
                      label={t.payments.status[student.paymentStatus]}
                    />
                  }
                />
                <InfoRow
                  label={t.students.profile.currentDebt}
                  value={
                    <span className={student.debt > 0 ? "text-destructive" : "text-success"}>
                      {formatUZS(student.debt)}
                    </span>
                  }
                />
                {student.notes && <InfoRow label={t.students.form.notes} value={student.notes} />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["present", attendanceCounts.present],
                ["late", attendanceCounts.late],
                ["absent", attendanceCounts.absent],
                ["excused", attendanceCounts.excused],
              ] as const
            ).map(([status, count]) => (
              <Card key={status} className="p-4 text-center">
                <p className="text-xl font-semibold tabular-nums">{count}</p>
                <div className="mt-1 flex justify-center">
                  <StatusBadge status={status} label={t.attendance[status]} />
                </div>
              </Card>
            ))}
          </div>
          <Card className="gap-2 py-5">
            <CardHeader className="flex items-center justify-between px-5">
              <CardTitle className="text-sm">{t.attendance.rate}</CardTitle>
              <span className="text-sm font-semibold tabular-nums">{student.attendanceRate}%</span>
            </CardHeader>
            <CardContent className="px-5">
              <Progress value={student.attendanceRate} className="h-2" />
              <Separator className="my-4" />
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {myAttendance.length === 0 ? (
                  <EmptyState icon={ClipboardCheck} title={t.attendance.empty} className="border-0 py-8" />
                ) : (
                  myAttendance.slice(0, 30).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <span className="text-sm tabular-nums">{formatDate(a.date, "EEE, dd MMM yyyy")}</span>
                      <StatusBadge status={a.status} label={t.attendance[a.status]} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="flex items-center justify-between px-5">
              <CardTitle className="text-sm">{t.students.profile.tabs.payments}</CardTitle>
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <CreditCard className="size-4" />
                {t.payments.recordPayment}
              </Button>
            </CardHeader>
            <CardContent className="px-5">
              {myPayments.length === 0 ? (
                <EmptyState icon={CreditCard} title={t.payments.empty} description={t.payments.emptyHint} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {myPayments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/8 text-primary">
                        <CreditCard className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.date)} · {t.payments.methods[p.method]} · {p.cashier}
                        </p>
                      </div>
                      <StatusBadge status={p.status} label={t.payments.status[p.status]} />
                      <span className="w-28 text-right text-sm font-semibold tabular-nums">
                        {formatUZS(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades */}
        <TabsContent value="grades" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.exams.grades}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {myGrades.length === 0 ? (
                <EmptyState icon={TrendingUp} title={t.exams.empty} description={t.exams.emptyHint} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {myGrades.map((g) => {
                    const exam = exams.find((e) => e.id === g.examId);
                    const pct = Math.round((g.score / g.maxScore) * 100);
                    return (
                      <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{exam?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {exam ? formatDate(exam.date) : ""}
                            {g.comment ? ` · ${g.comment}` : ""}
                          </p>
                        </div>
                        <div className="flex w-40 items-center gap-2">
                          <Progress value={pct} className="h-1.5" />
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive"
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <span className="w-16 text-right text-sm font-semibold tabular-nums">
                          {g.score}/{g.maxScore}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.students.profile.tabs.exams}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {myExams.length === 0 ? (
                <EmptyState icon={FileText} title={t.exams.empty} description={t.exams.emptyHint} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {myExams.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.date)} · {t.exams.maxScore}: {e.maxScore}
                        </p>
                      </div>
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
              <CardTitle className="text-sm">
                {t.dashboard.upcomingClasses} · {group?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {myEvents.length === 0 ? (
                <EmptyState icon={CalendarDays} title={t.schedule.noClasses} description={t.schedule.noClassesHint} className="border-0 py-8" />
              ) : (
                <div className="space-y-1">
                  {myEvents.map((e) => (
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
                          {e.startTime}–{e.endTime}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {course?.name} · {t.common.room} {e.room}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          <EmptyState
            icon={Upload}
            title={t.students.profile.noDocuments}
            description={t.students.profile.noDocumentsHint}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.info(t.common.comingSoon)}
              >
                <Upload className="size-4" />
                {t.students.profile.uploadDocument}
              </Button>
            }
          />
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">{t.students.profile.activityTimeline}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <div className="relative space-y-0 pl-1">
                {myActivity.map((a, i) => {
                  const Icon = activityIcon[a.type];
                  return (
                    <div key={a.id} className="relative flex gap-3 pb-6 last:pb-0">
                      {i < myActivity.length - 1 && (
                        <span className="absolute top-8 left-[15px] h-full w-px bg-border" />
                      )}
                      <div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card">
                        <Icon className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="text-sm">{a.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(a.date)} · {a.actor}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        student={student}
      />
    </div>
  );
}
