"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useT } from "@/lib/i18n";
import {
  attendanceSeries,
  collectionSeries,
  leadFunnel,
  registrationSeries,
  revenueSeries,
  studentGrowthSeries,
  type SeriesPoint,
} from "@/data";
import { formatCompact, formatDate } from "@/lib/format";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";
import { PeriodTabs, periodDays, type Period } from "./period-tabs";

function aggregate(
  series: SeriesPoint[],
  keys: string[],
  bucket: number,
  mode: "sum" | "avg" = "sum"
): SeriesPoint[] {
  if (bucket <= 1) return series;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < series.length; i += bucket) {
    const chunk = series.slice(i, i + bucket);
    const point: SeriesPoint = { date: chunk[chunk.length - 1].date };
    for (const k of keys) {
      const sum = chunk.reduce((acc, p) => acc + (Number(p[k]) || 0), 0);
      point[k] = mode === "avg" ? Math.round((sum / chunk.length) * 10) / 10 : sum;
    }
    out.push(point);
  }
  return out;
}

function ChartCard({
  title,
  action,
  loading,
  children,
  className,
  index = 0,
}: {
  title: string;
  action?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.06, ease: "easeOut" }}
      className={cn("min-w-0", className)}
    >
      <Card className="h-full gap-4">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[15px]">{title}</CardTitle>
          {action}
        </CardHeader>
        <CardContent>{loading ? <ChartSkeleton height={260} /> : children}</CardContent>
      </Card>
    </motion.div>
  );
}

export function RevenueChart({ loading }: { loading?: boolean }) {
  const t = useT();
  const [period, setPeriod] = React.useState<Period>("d30");
  const days = periodDays[period];
  const bucket = days > 90 ? 7 : 1;
  const data = aggregate(revenueSeries.slice(-days), ["revenue", "expected"], bucket);

  const config = {
    revenue: { label: t.dashboard.collected, color: "var(--chart-1)" },
    expected: { label: t.dashboard.expected, color: "var(--chart-4)" },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t.dashboard.revenueOverview}
      action={<PeriodTabs value={period} onChange={setPeriod} />}
      loading={loading}
      index={0}
    >
      <ChartContainer config={config} className="h-64 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 4 }}>
          <defs>
            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(v: string) => formatDate(v, "dd MMM")}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) => formatDate(String(v))}
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2 rounded-[2px]"
                        style={{ background: item.color }}
                      />
                      {config[name as keyof typeof config]?.label ?? name}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatCompact(Number(value))} UZS
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="expected"
            type="monotone"
            stroke="var(--color-expected)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
          />
          <Area
            dataKey="revenue"
            type="monotone"
            stroke="var(--color-revenue)"
            strokeWidth={2}
            fill="url(#fillRevenue)"
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  );
}

export function StudentGrowthChart({ loading }: { loading?: boolean }) {
  const t = useT();
  const config = {
    total: { label: t.dashboard.totalStudents, color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <ChartCard title={t.dashboard.studentGrowth} loading={loading} index={1}>
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart data={studentGrowthSeries} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v: string) => formatDate(v, "MMM")}
          />
          <YAxis tickLine={false} axisLine={false} width={36} />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v), "MMMM yyyy")} />}
          />
          <Bar dataKey="total" fill="var(--color-total)" radius={[5, 5, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

export function AttendanceChart({ loading }: { loading?: boolean }) {
  const t = useT();
  const [period, setPeriod] = React.useState<Period>("d30");
  const days = Math.min(periodDays[period], 90);
  const data = aggregate(
    attendanceSeries.slice(-days),
    ["rate"],
    days > 45 ? 6 : 1,
    "avg"
  );

  const config = {
    rate: { label: t.dashboard.attendanceRate, color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t.dashboard.attendanceAnalytics}
      action={<PeriodTabs value={period} onChange={setPeriod} options={["d7", "d30", "m3"]} />}
      loading={loading}
      index={2}
    >
      <ChartContainer config={config} className="h-64 w-full">
        <LineChart data={data} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(v: string) => formatDate(v, "dd MMM")}
          />
          <YAxis domain={[70, 100]} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v))} />}
          />
          <Line
            dataKey="rate"
            type="monotone"
            stroke="var(--color-rate)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}

export function RegistrationsChart({ loading }: { loading?: boolean }) {
  const t = useT();
  const [period, setPeriod] = React.useState<Period>("m3");
  const weeks = Math.max(4, Math.round(periodDays[period] / 7));
  const data = registrationSeries.slice(-weeks);

  const config = {
    students: { label: t.dashboard.enrolled, color: "var(--chart-1)" },
    leads: { label: t.dashboard.leads, color: "var(--chart-3)" },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t.dashboard.newRegistrations}
      action={<PeriodTabs value={period} onChange={setPeriod} options={["d30", "m3", "m6"]} />}
      loading={loading}
      index={3}
    >
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart data={data} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(v: string) => formatDate(v, "dd MMM")}
          />
          <YAxis tickLine={false} axisLine={false} width={30} />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v))} />}
          />
          <Bar dataKey="leads" fill="var(--color-leads)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="students" fill="var(--color-students)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

export function LeadConversionChart({ loading }: { loading?: boolean }) {
  const t = useT();
  const data = leadFunnel.map((f) => ({
    ...f,
    label: t.leads.stages[f.stage],
  }));
  const max = Math.max(...data.map((d) => d.count));

  const config = {
    count: { label: t.dashboard.leads, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const palette = ["var(--chart-1)", "var(--chart-4)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)", "var(--chart-2)"];

  return (
    <ChartCard title={t.dashboard.leadConversion} loading={loading} index={4}>
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, max]} tickLine={false} axisLine={false} hide />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={104}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

export function PaymentCollectionChart({ loading }: { loading?: boolean }) {
  const t = useT();
  const [period, setPeriod] = React.useState<Period>("m6");
  const months = period === "y1" ? 12 : period === "m6" ? 6 : 3;
  const data = collectionSeries.slice(-months);

  const config = {
    expected: { label: t.dashboard.expected, color: "var(--chart-3)" },
    collected: { label: t.dashboard.collected, color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t.dashboard.paymentCollection}
      action={<PeriodTabs value={period} onChange={setPeriod} options={["m3", "m6", "y1"]} />}
      loading={loading}
      index={5}
    >
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart data={data} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v: string) => formatDate(v, "MMM")}
          />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) => formatDate(String(v), "MMMM yyyy")}
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-[2px]" style={{ background: item.color }} />
                      {config[name as keyof typeof config]?.label ?? name}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatCompact(Number(value))} UZS
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="expected" fill="var(--color-expected)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
