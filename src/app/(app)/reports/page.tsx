"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import {
  BarChart3,
  Building2,
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Kanban,
  Users,
  Wallet,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  attendanceSeries,
  branches,
  courses,
  debts,
  leadFunnel,
  revenueSeries,
  students,
  studentGrowthSeries,
  teachers,
} from "@/data";
import {
  formatCompact,
  formatDate,
  formatUZS,
  fullName,
} from "@/lib/format";
import { exportCSV, exportExcel, exportPDF } from "@/lib/export";
import type { Dict } from "@/translations";
import { cn } from "@/lib/utils";

type ReportKey =
  | "studentsR"
  | "attendanceR"
  | "revenueR"
  | "debtR"
  | "teacherR"
  | "courseR"
  | "leadsR"
  | "branchR";

const reportIcons: Record<ReportKey, LucideIcon> = {
  studentsR: GraduationCap,
  attendanceR: ClipboardCheck,
  revenueR: Wallet,
  debtR: WalletMinimal,
  teacherR: Users,
  courseR: BookOpen,
  leadsR: Kanban,
  branchR: Building2,
};

const REPORTS: ReportKey[] = [
  "studentsR",
  "attendanceR",
  "revenueR",
  "debtR",
  "teacherR",
  "courseR",
  "leadsR",
  "branchR",
];

export default function ReportsPage() {
  const t = useT();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);

  const [report, setReport] = React.useState<ReportKey>("revenueR");
  const [from, setFrom] = React.useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [courseFilter, setCourseFilter] = React.useState("all");

  const scopedStudents = React.useMemo(
    () =>
      students.filter(
        (s) =>
          (branchId === "all" || s.branchId === branchId) &&
          (courseFilter === "all" || s.courseId === courseFilter)
      ),
    [branchId, courseFilter]
  );

  // ── Report data ────────────────────────────────────────────────────
  const data = React.useMemo(() => {
    switch (report) {
      case "revenueR": {
        const rows = revenueSeries
          .filter((p) => p.date >= from && p.date <= to)
          .map((p) => ({ label: p.date, value: p.revenue as number }));
        return {
          chart: rows,
          headers: [t.common.date, t.dashboard.revenue],
          table: rows.map((r) => [r.label, r.value]),
          total: rows.reduce((s, r) => s + r.value, 0),
          totalLabel: t.dashboard.monthlyRevenue,
          money: true,
          type: "line" as const,
        };
      }
      case "studentsR": {
        const rows = studentGrowthSeries.map((p) => ({
          label: p.date,
          value: p.total as number,
        }));
        return {
          chart: rows,
          headers: [t.common.date, t.dashboard.totalStudents],
          table: scopedStudents.map((s) => [
            fullName(s),
            courses.find((c) => c.id === s.courseId)?.name ?? "",
            `${s.attendanceRate}%`,
            s.debt,
          ]),
          tableHeaders: [t.common.name, t.common.course, t.nav.attendance, t.debts.debt],
          total: scopedStudents.length,
          totalLabel: t.dashboard.totalStudents,
          money: false,
          type: "bar" as const,
        };
      }
      case "attendanceR": {
        const rows = attendanceSeries
          .filter((p) => p.date >= from && p.date <= to)
          .map((p) => ({ label: p.date, value: p.rate as number }));
        return {
          chart: rows,
          headers: [t.common.date, t.attendance.rate],
          table: rows.map((r) => [r.label, `${r.value}%`]),
          total: rows.length
            ? Math.round((rows.reduce((s, r) => s + r.value, 0) / rows.length) * 10) / 10
            : 0,
          totalLabel: t.attendance.rate,
          money: false,
          suffix: "%",
          type: "line" as const,
        };
      }
      case "debtR": {
        const rows = debts
          .map((d) => {
            const s = students.find((x) => x.id === d.studentId);
            return { s, d };
          })
          .filter(({ s }) => s && (branchId === "all" || s.branchId === branchId))
          .slice(0, 40);
        return {
          chart: rows.slice(0, 12).map(({ s, d }) => ({
            label: s ? s.firstName : "",
            value: d.debt,
          })),
          headers: [t.common.name, t.debts.debt, t.debts.dueDate],
          table: rows.map(({ s, d }) => [s ? fullName(s) : "", d.debt, d.dueDate]),
          total: rows.reduce((sum, { d }) => sum + d.debt, 0),
          totalLabel: t.debts.totalDebt,
          money: true,
          type: "bar" as const,
        };
      }
      case "teacherR": {
        const rows = teachers
          .filter((x) => branchId === "all" || x.branchId === branchId)
          .map((x) => ({ label: x.firstName, value: x.rating * 20, teacher: x }));
        return {
          chart: rows,
          headers: [t.common.teacher, t.teachers.studentsCol, t.common.rating, t.nav.attendance],
          table: rows.map(({ teacher }) => [
            fullName(teacher),
            teacher.studentCount,
            teacher.rating,
            `${teacher.attendanceRate}%`,
          ]),
          total: rows.length,
          totalLabel: t.nav.teachers,
          money: false,
          type: "bar" as const,
        };
      }
      case "courseR": {
        const rows = courses.map((c) => ({
          label: c.name,
          value: c.studentCount,
          course: c,
        }));
        return {
          chart: rows,
          headers: [t.common.course, t.nav.students, t.nav.groups, t.common.price],
          table: rows.map(({ course }) => [
            course.name,
            course.studentCount,
            course.groupCount,
            course.price,
          ]),
          total: rows.reduce((s, r) => s + r.value, 0),
          totalLabel: t.dashboard.totalStudents,
          money: false,
          type: "bar" as const,
        };
      }
      case "leadsR": {
        const rows = leadFunnel.map((f) => ({
          label: t.leads.stages[f.stage],
          value: f.count,
        }));
        return {
          chart: rows,
          headers: [t.common.status, t.dashboard.leads],
          table: rows.map((r) => [r.label, r.value]),
          total: rows.reduce((s, r) => s + r.value, 0),
          totalLabel: t.dashboard.leads,
          money: false,
          type: "bar" as const,
        };
      }
      case "branchR": {
        const rows = branches.map((b) => ({
          label: b.name,
          value: b.monthlyRevenue,
          branch: b,
        }));
        return {
          chart: rows,
          headers: [t.nav.branches, t.nav.students, t.nav.groups, t.branches.revenue],
          table: rows.map(({ branch }) => [
            branch.name,
            branch.students,
            branch.groups,
            branch.monthlyRevenue,
          ]),
          total: rows.reduce((s, r) => s + r.value, 0),
          totalLabel: t.branches.revenue,
          money: true,
          type: "bar" as const,
        };
      }
    }
  }, [report, from, to, branchId, scopedStudents, t]);

  const chartConfig = {
    value: { label: t.common.total, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const tableHeaders = "tableHeaders" in data && data.tableHeaders ? data.tableHeaders : data.headers;
  const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  const doExport = (kind: "csv" | "excel" | "pdf") => {
    const title = t.reports.types[report];
    if (kind === "csv") exportCSV(`report-${report}`, tableHeaders, data.table);
    else if (kind === "excel") exportExcel(`report-${report}`, tableHeaders, data.table);
    else exportPDF(title, tableHeaders, data.table);
    toast.success(t.reports.exported);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t.reports.title} description={t.reports.subtitle} />

      {/* Report type picker */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {REPORTS.map((key) => {
          const Icon = reportIcons[key];
          const active = report === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setReport(key)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all",
                active
                  ? "border-primary/40 bg-primary/6 shadow-sm"
                  : "bg-card hover:border-foreground/20 hover:bg-muted/40"
              )}
            >
              <Icon className={cn("size-4.5", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[11px] leading-tight font-medium", active && "text-primary")}>
                {t.reports.types[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters + exports */}
      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full space-y-1.5 sm:w-auto">
            <Label htmlFor="rep-from" className="text-xs">
              {t.reports.dateRange}
            </Label>
            <div className="flex w-full items-center gap-2">
              <Input
                id="rep-from"
                aria-label={t.a11y.rangeFrom}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 w-full min-w-0 flex-1 sm:w-auto sm:flex-initial"
              />
              <span className="shrink-0 text-muted-foreground">–</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 w-full min-w-0 flex-1 sm:w-auto sm:flex-initial"
                aria-label={t.a11y.rangeTo}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t.common.course}</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => doExport("csv")}>
              <FileText className="size-4" />
              {t.reports.exportCsv}
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("excel")}>
              <FileSpreadsheet className="size-4" />
              {t.reports.exportExcel}
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("pdf")}>
              <BarChart3 className="size-4" />
              {t.reports.exportPdf}
            </Button>
          </div>
        </div>
      </Card>

      {/* Chart + table */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-5">
        <Card className="min-w-0 gap-3 py-5 lg:col-span-3">
          <CardHeader className="flex items-center justify-between px-5">
            <CardTitle className="text-sm">{t.reports.types[report]}</CardTitle>
            <div className="text-right">
              <p className="text-lg leading-none font-semibold tabular-nums">
                {data.money
                  ? `${formatCompact(data.total)} UZS`
                  : `${data.total}${"suffix" in data && data.suffix ? data.suffix : ""}`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{data.totalLabel}</p>
            </div>
          </CardHeader>
          <CardContent className="px-5">
            {loading ? (
              <ChartSkeleton height={280} />
            ) : (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                {data.type === "line" ? (
                  <LineChart data={data.chart} margin={{ left: 4, right: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(v: string) =>
                        /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, "dd MMM") : v
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tickFormatter={(v: number) => (data.money ? formatCompact(v) : String(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="value"
                      type="monotone"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={data.chart} margin={{ left: 4, right: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={8}
                      tickFormatter={(v: string) =>
                        /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, "MMM") : v.slice(0, 10)
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tickFormatter={(v: number) => (data.money ? formatCompact(v) : String(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={34}>
                      {data.chart.map((_, i) => (
                        <Cell key={i} fill={palette[i % palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-2 py-5 lg:col-span-2">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">{t.common.statistics}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    {tableHeaders.map((h) => (
                      <th key={h} className="py-2 pr-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.table.slice(0, 40).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2 pr-3 tabular-nums">
                          {typeof cell === "number" && data.money && j > 0
                            ? formatUZS(cell)
                            : typeof cell === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cell)
                              ? formatDate(cell)
                              : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export type { Dict };
