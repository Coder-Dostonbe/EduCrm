"use client";

import * as React from "react";
import {
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Kanban,
  UsersRound,
  WalletMinimal,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { kpis } from "@/data";
import { formatNumber, percentChange, formatCompact } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  AttendanceChart,
  LeadConversionChart,
  PaymentCollectionChart,
  RegistrationsChart,
  RevenueChart,
  StudentGrowthChart,
} from "@/components/dashboard/charts";
import {
  AttendanceOverviewWidget,
  DebtorsWidget,
  LeadPipelineWidget,
  RecentPaymentsWidget,
  RecentStudentsWidget,
  TodaysScheduleWidget,
  TopTeachersWidget,
  UpcomingClassesWidget,
} from "@/components/dashboard/widgets";
import { format } from "date-fns";
import { uz as uzLocale, ru as ruLocale, enUS } from "date-fns/locale";

export default function DashboardPage() {
  const t = useT();
  const { language } = useI18n();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(700);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t.dashboard.goodMorning : hour < 18 ? t.dashboard.goodAfternoon : t.dashboard.goodEvening;
  const firstName = user?.name.split(" ")[0] ?? "";
  const locale = language === "ru" ? ruLocale : language === "en" ? enUS : uzLocale;
  const dateStr = format(new Date(), "EEEE, d MMMM yyyy", { locale });

  const isStaff = role === "admin" || role === "manager";
  const asStudent = role === "student" ? studentForUser(user) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="capitalize">{dateStr}</span> ·{" "}
          {asStudent ? t.dashboard.studentSummary : t.dashboard.summary}
        </p>
      </div>

      {asStudent ? <StudentDashboard student={asStudent} loading={loading} /> : null}

      {/* KPI cards */}
      {isStaff && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          <StatCard
            index={0}
            label={t.dashboard.totalStudents}
            value={formatNumber(kpis.totalStudents)}
            icon={GraduationCap}
            change={percentChange(kpis.totalStudents, kpis.totalStudentsPrev)}
          />
          <StatCard
            index={1}
            label={t.dashboard.activeGroups}
            value={formatNumber(kpis.activeGroups + 20)}
            icon={UsersRound}
            change={percentChange(kpis.activeGroups, kpis.activeGroupsPrev)}
          />
          <StatCard
            index={2}
            label={t.dashboard.monthlyRevenue}
            value={`${formatCompact(kpis.monthRevenue)} UZS`}
            icon={CreditCard}
            change={percentChange(kpis.monthRevenue, kpis.prevMonthRevenue)}
          />
          <StatCard
            index={3}
            label={t.dashboard.outstandingDebts}
            value={`${formatCompact(kpis.totalDebt)} UZS`}
            icon={WalletMinimal}
            change={percentChange(kpis.totalDebt, kpis.totalDebtPrev)}
            invertTrend
          />
          <StatCard
            index={4}
            label={t.dashboard.attendanceRate}
            value={`${kpis.attendanceRate}%`}
            icon={ClipboardCheck}
            change={percentChange(kpis.attendanceRate, kpis.attendanceRatePrev)}
          />
          <StatCard
            index={5}
            label={t.dashboard.newLeads}
            value={formatNumber(kpis.newLeads)}
            icon={Kanban}
            change={percentChange(kpis.newLeads, kpis.newLeadsPrev)}
          />
        </div>
      )}

      {/* Charts */}
      {isStaff && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <RevenueChart loading={loading} />
          <StudentGrowthChart loading={loading} />
          <AttendanceChart loading={loading} />
          <RegistrationsChart loading={loading} />
          <LeadConversionChart loading={loading} />
          <PaymentCollectionChart loading={loading} />
        </div>
      )}

      {/* Widgets — centre-wide, so not for a student */}
      {asStudent ? null : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TodaysScheduleWidget loading={loading} index={0} />
          <UpcomingClassesWidget loading={loading} index={1} />
          {isStaff ? (
            <>
              <RecentStudentsWidget loading={loading} index={2} />
              <RecentPaymentsWidget loading={loading} index={3} />
              <DebtorsWidget loading={loading} index={4} />
              <AttendanceOverviewWidget loading={loading} index={5} />
              <TopTeachersWidget loading={loading} index={6} />
              <LeadPipelineWidget loading={loading} index={7} />
            </>
          ) : (
            <AttendanceOverviewWidget loading={loading} index={2} />
          )}
        </div>
      )}
    </div>
  );
}
