"use client";

import * as React from "react";
import { format, subMonths } from "date-fns";
import { uz as uzLocale, ru as ruLocale, enUS } from "date-fns/locale";
import { BadgeCheck, Banknote, Download, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useT, useI18n } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { salaries as seedSalaries } from "@/data";
import { formatCompact, formatDateShort, formatUZS, initials } from "@/lib/format";
import { exportCSV } from "@/lib/export";
import type { SalaryRecord } from "@/types";

export default function SalariesPage() {
  const t = useT();
  const { language } = useI18n();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);
  const locale = language === "ru" ? ruLocale : language === "en" ? enUS : uzLocale;

  const months = React.useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => {
        const d = subMonths(new Date(), i);
        return format(d, "yyyy-MM");
      }),
    []
  );

  const [items, setItems] = React.useState<SalaryRecord[]>(seedSalaries);
  const [month, setMonth] = React.useState(months[0]);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (s.month !== month) return false;
      if (branchId !== "all" && s.branchId !== branchId) return false;
      if (q && !`${s.employeeName} ${s.role}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, month, branchId, query]);

  const stats = React.useMemo(() => {
    const total = filtered.reduce((s, x) => s + x.total, 0);
    const pending = filtered
      .filter((x) => x.status === "pending")
      .reduce((s, x) => s + x.total, 0);
    const paid = total - pending;
    return { total, pending, paid };
  }, [filtered]);

  const columns: DataTableColumn<SalaryRecord>[] = [
    {
      id: "employee",
      header: t.salaries.employee,
      hideable: false,
      sortAccessor: (s) => s.employeeName,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {initials(s.employeeName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{s.employeeName}</p>
            <p className="truncate text-xs text-muted-foreground">{s.role}</p>
          </div>
        </div>
      ),
    },
    {
      id: "base",
      header: t.salaries.baseSalary,
      sortAccessor: (s) => s.baseSalary,
      cell: (s) => <span className="whitespace-nowrap tabular-nums">{formatUZS(s.baseSalary)}</span>,
    },
    {
      id: "bonus",
      header: t.salaries.bonuses,
      sortAccessor: (s) => s.bonus,
      cell: (s) =>
        s.bonus > 0 ? (
          <span className="whitespace-nowrap text-success tabular-nums">+{formatUZS(s.bonus)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "deductions",
      header: t.salaries.deductions,
      sortAccessor: (s) => s.deductions,
      cell: (s) =>
        s.deductions > 0 ? (
          <span className="whitespace-nowrap text-destructive tabular-nums">
            −{formatUZS(s.deductions)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "total",
      header: t.salaries.totalCol,
      sortAccessor: (s) => s.total,
      cell: (s) => (
        <span className="font-semibold whitespace-nowrap tabular-nums">{formatUZS(s.total)}</span>
      ),
    },
    {
      id: "paymentDate",
      header: t.salaries.paymentDate,
      sortAccessor: (s) => s.paymentDate ?? "",
      cell: (s) =>
        s.paymentDate ? (
          <span className="tabular-nums">{formatDateShort(s.paymentDate)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (s) => s.status,
      cell: (s) => (
        <StatusBadge
          status={s.status}
          label={s.status === "paid" ? t.payments.status.paid : t.payments.status.pending}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      hideable: false,
      className: "w-20 text-right",
      cell: (s) =>
        s.status === "pending" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setItems((prev) =>
                prev.map((x) =>
                  x.id === s.id
                    ? {
                        ...x,
                        status: "paid",
                        paymentDate: format(new Date(), "yyyy-MM-dd"),
                      }
                    : x
                )
              );
              toast.success(t.salaries.paidOut, { description: s.employeeName });
            }}
          >
            <Banknote className="size-3.5" />
            {t.salaries.paySalary}
          </Button>
        ) : (
          <BadgeCheck className="ml-auto size-4 text-success" />
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.salaries.title}
        description={t.salaries.subtitle}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportCSV(
                `salaries-${month}`,
                [t.salaries.employee, t.salaries.baseSalary, t.salaries.bonuses, t.salaries.deductions, t.salaries.totalCol, t.common.status],
                filtered.map((s) => [s.employeeName, s.baseSalary, s.bonus, s.deductions, s.total, s.status])
              );
              toast.success(t.reports.exported);
            }}
          >
            <Download className="size-4" />
            {t.common.export}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <StatCard index={0} label={t.salaries.payrollTotal} value={`${formatCompact(stats.total)} UZS`} icon={Wallet} />
        <StatCard index={1} label={t.debts.paid} value={`${formatCompact(stats.paid)} UZS`} icon={BadgeCheck} />
        <StatCard index={2} label={t.salaries.pendingPayout} value={`${formatCompact(stats.pending)} UZS`} icon={Banknote} />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(s) => s.id}
        loading={loading}
        initialSort={{ id: "total", desc: true }}
        emptyState={
          <EmptyState icon={Wallet} title={t.salaries.empty} description={t.salaries.emptyHint} />
        }
        toolbar={
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger size="sm" className="w-auto min-w-36 capitalize" aria-label={t.salaries.month}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {format(new Date(`${m}-01T00:00:00`), "LLLL yyyy", { locale })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </>
        }
      />
    </div>
  );
}
