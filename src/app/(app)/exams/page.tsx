"use client";

import * as React from "react";
import { BarChart3, FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  courseById,
  exams,
  grades,
  groupById,
  studentById,
  teacherById,
} from "@/data";
import { formatDateShort, fullName } from "@/lib/format";
import type { Exam } from "@/types";
import { cn } from "@/lib/utils";

export default function ExamsPage() {
  const t = useT();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(450);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const asStudent = role === "student" ? studentForUser(user) : null;

  const visibleExams = React.useMemo(
    () =>
      exams.filter((e) => {
        if (role === "teacher" && e.teacherId !== user?.id) return false;
        // Fail closed: an unresolved student sees nothing rather than
        // everything, which is what an unmatched record used to mean.
        if (role === "student" && e.groupId !== asStudent?.groupId) return false;
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        if (query && !e.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
        return true;
      }),
    [role, user, asStudent, statusFilter, query]
  );

  const gradedExams = React.useMemo(
    () => visibleExams.filter((e) => e.status === "graded"),
    [visibleExams]
  );
  const [pickedExamId, setSelectedExamId] = React.useState<string>("");
  // Derived: keep a valid selection even when filters change the list.
  const selectedExamId = gradedExams.some((e) => e.id === pickedExamId)
    ? pickedExamId
    : (gradedExams[0]?.id ?? "");

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const examGrades = grades.filter((g) => g.examId === selectedExamId);

  const statusLabel = (s: Exam["status"]) =>
    s === "graded" ? t.exams.graded : s === "upcoming" ? t.exams.upcoming : t.exams.inProgress;

  const columns: DataTableColumn<Exam>[] = [
    {
      id: "name",
      header: t.exams.examName,
      hideable: false,
      sortAccessor: (e) => e.name,
      cell: (e) => (
        <div>
          <p className="font-medium">{e.name}</p>
          <p className="text-xs text-muted-foreground">{courseById.get(e.courseId)?.name}</p>
        </div>
      ),
    },
    {
      id: "group",
      header: t.common.group,
      sortAccessor: (e) => groupById.get(e.groupId)?.name ?? "",
      cell: (e) => groupById.get(e.groupId)?.name ?? "—",
    },
    {
      id: "teacher",
      header: t.common.teacher,
      cell: (e) => {
        const teacher = teacherById.get(e.teacherId);
        return teacher ? fullName(teacher) : "—";
      },
    },
    {
      id: "date",
      header: t.common.date,
      sortAccessor: (e) => e.date,
      cell: (e) => <span className="tabular-nums">{formatDateShort(e.date)}</span>,
    },
    {
      id: "participants",
      header: t.exams.participants,
      sortAccessor: (e) => e.participants,
      cell: (e) => <span className="tabular-nums">{e.participants}</span>,
    },
    {
      id: "maxScore",
      header: t.exams.maxScore,
      cell: (e) => <span className="tabular-nums">{e.maxScore}</span>,
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (e) => e.status,
      cell: (e) => <StatusBadge status={e.status} label={statusLabel(e.status)} />,
    },
  ];

  // Score distribution for the selected exam
  const distribution = React.useMemo(() => {
    const buckets = [
      { range: "0–40", min: 0, max: 40, count: 0 },
      { range: "41–60", min: 41, max: 60, count: 0 },
      { range: "61–75", min: 61, max: 75, count: 0 },
      { range: "76–90", min: 76, max: 90, count: 0 },
      { range: "91–100", min: 91, max: 100, count: 0 },
    ];
    for (const g of examGrades) {
      const pct = Math.round((g.score / g.maxScore) * 100);
      const bucket = buckets.find((b) => pct >= b.min && pct <= b.max);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }, [examGrades]);

  const avgPct = examGrades.length
    ? Math.round(
        (examGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / examGrades.length) * 100
      )
    : 0;
  const passRate = examGrades.length
    ? Math.round(
        (examGrades.filter((g) => g.score / g.maxScore >= 0.6).length / examGrades.length) * 100
      )
    : 0;

  const chartConfig = {
    count: { label: t.exams.participants, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const gradeLetter = (pct: number) =>
    pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.exams.title}
        description={t.exams.subtitle}
        actions={
          role !== "student" ? (
            <Button size="sm" onClick={() => toast.info(t.common.comingSoon)}>
              <Plus className="size-4" />
              {t.exams.addExam}
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="exams">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="exams">{t.nav.exams}</TabsTrigger>
            <TabsTrigger value="grades">{t.exams.grades}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="exams" className="mt-4">
          <DataTable
            data={visibleExams}
            columns={columns}
            getRowId={(e) => e.id}
            loading={loading}
            initialSort={{ id: "date", desc: true }}
            emptyState={
              <EmptyState icon={FileText} title={t.exams.empty} description={t.exams.emptyHint} />
            }
            toolbar={
              <>
                <div className="relative w-full max-w-60">
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.common.searchPlaceholder}
                    aria-label={t.common.search}
                    className="h-8 pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger size="sm" className="w-auto min-w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.all}: {t.common.status}</SelectItem>
                    <SelectItem value="upcoming">{t.exams.upcoming}</SelectItem>
                    <SelectItem value="in-progress">{t.exams.inProgress}</SelectItem>
                    <SelectItem value="graded">{t.exams.graded}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="grades" className="mt-4 space-y-4">
          {gradedExams.length === 0 ? (
            <EmptyState icon={BarChart3} title={t.exams.empty} description={t.exams.emptyHint} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger size="sm" className="w-auto min-w-56" aria-label={t.nav.exams}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gradedExams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {groupById.get(e.groupId)?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto flex gap-3">
                  <div className="rounded-lg border bg-card px-4 py-2 text-center">
                    <p className="text-lg leading-none font-semibold tabular-nums">{avgPct}%</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t.exams.avgScore}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-4 py-2 text-center">
                    <p
                      className={cn(
                        "text-lg leading-none font-semibold tabular-nums",
                        passRate >= 80 ? "text-success" : passRate >= 60 ? "text-warning" : "text-destructive"
                      )}
                    >
                      {passRate}%
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t.exams.passRate}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                {/* Distribution chart */}
                <Card className="min-w-0 gap-3 py-5 lg:col-span-2">
                  <CardHeader className="px-5">
                    <CardTitle className="text-sm">{t.exams.performanceChart}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5">
                    <ChartContainer config={chartConfig} className="h-56 w-full">
                      <BarChart data={distribution} margin={{ left: 4, right: 4 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} width={26} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Grades table */}
                <Card className="min-w-0 gap-2 py-5 lg:col-span-3">
                  <CardHeader className="px-5">
                    <CardTitle className="text-sm">
                      {selectedExam?.name} · {t.exams.grades}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5">
                    <div className="max-h-96 space-y-1 overflow-y-auto">
                      {examGrades
                        .slice()
                        .sort((a, b) => b.score / b.maxScore - a.score / a.maxScore)
                        .map((g) => {
                          const s = studentById.get(g.studentId);
                          const pct = Math.round((g.score / g.maxScore) * 100);
                          return (
                            <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {s ? fullName(s) : "—"}
                                </p>
                                {g.comment && (
                                  <p className="truncate text-xs text-muted-foreground">{g.comment}</p>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "flex size-6 items-center justify-center rounded-md text-xs font-bold",
                                  pct >= 80
                                    ? "bg-success/10 text-success"
                                    : pct >= 60
                                      ? "bg-warning/15 text-warning"
                                      : "bg-destructive/10 text-destructive"
                                )}
                              >
                                {gradeLetter(pct)}
                              </span>
                              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                                {pct}%
                              </span>
                              <span className="w-14 text-right text-sm font-semibold tabular-nums">
                                {g.score}/{g.maxScore}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
