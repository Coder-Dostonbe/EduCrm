"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CreditCard,
  Eye,
  MoreHorizontal,
  Search,
  Users,
  Wallet,
  WalletMinimal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { courseById, debts as seedDebts, groupById, studentById } from "@/data";
import {
  formatCompact,
  formatDateShort,
  formatPhone,
  formatUZS,
  fullName,
  initials,
} from "@/lib/format";
import type { Debt, Student } from "@/types";

export default function DebtsPage() {
  const t = useT();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);
  const [items, setItems] = React.useState<Debt[]>(seedDebts);
  const [query, setQuery] = React.useState("");
  const [paymentFor, setPaymentFor] = React.useState<Student | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      const s = studentById.get(d.studentId);
      if (!s) return false;
      if (branchId !== "all" && s.branchId !== branchId) return false;
      if (q && !`${fullName(s)} ${s.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, branchId, query]);

  const stats = React.useMemo(() => {
    const total = filtered.reduce((s, d) => s + d.debt, 0);
    const overdue = filtered
      .filter((d) => d.overdueDays > 0)
      .reduce((s, d) => s + d.debt, 0);
    return {
      total,
      overdue,
      count: filtered.length,
      avg: filtered.length ? Math.round(total / filtered.length) : 0,
    };
  }, [filtered]);

  const columns: DataTableColumn<Debt>[] = [
    {
      id: "student",
      header: t.payments.form.student,
      hideable: false,
      sortAccessor: (d) => {
        const s = studentById.get(d.studentId);
        return s ? fullName(s) : "";
      },
      cell: (d) => {
        const s = studentById.get(d.studentId);
        if (!s) return "—";
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-destructive/10 text-[11px] font-semibold text-destructive">
                {initials(fullName(s))}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{fullName(s)}</p>
              <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {formatPhone(s.phone)}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "course",
      header: t.common.course,
      cell: (d) => {
        const s = studentById.get(d.studentId);
        return s ? (courseById.get(s.courseId)?.name ?? "—") : "—";
      },
    },
    {
      id: "group",
      header: t.common.group,
      defaultHidden: true,
      cell: (d) => {
        const s = studentById.get(d.studentId);
        return s ? (groupById.get(s.groupId)?.name ?? "—") : "—";
      },
    },
    {
      id: "expected",
      header: t.debts.expectedPayment,
      sortAccessor: (d) => d.expected,
      cell: (d) => <span className="whitespace-nowrap tabular-nums">{formatUZS(d.expected)}</span>,
    },
    {
      id: "paid",
      header: t.debts.paid,
      sortAccessor: (d) => d.paid,
      cell: (d) => (
        <span className="whitespace-nowrap text-success tabular-nums">{formatUZS(d.paid)}</span>
      ),
    },
    {
      id: "debt",
      header: t.debts.debt,
      sortAccessor: (d) => d.debt,
      cell: (d) => (
        <span className="font-semibold whitespace-nowrap text-destructive tabular-nums">
          {formatUZS(d.debt)}
        </span>
      ),
    },
    {
      id: "dueDate",
      header: t.debts.dueDate,
      sortAccessor: (d) => d.dueDate,
      cell: (d) => (
        <div>
          <p className="tabular-nums">{formatDateShort(d.dueDate)}</p>
          {d.overdueDays > 0 && (
            <p className="text-xs text-destructive">
              {d.overdueDays} {t.debts.daysOverdue}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (d) => (d.overdueDays > 0 ? "overdue" : "pending"),
      cell: (d) => (
        <StatusBadge
          status={d.overdueDays > 0 ? "overdue" : "pending"}
          label={d.overdueDays > 0 ? t.payments.status.overdue : t.payments.status.pending}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      hideable: false,
      className: "w-10 text-right",
      cell: (d) => {
        const s = studentById.get(d.studentId);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t.common.actions}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() =>
                  toast.success(t.debts.reminderSent, {
                    description: s ? `${s.parentName} · ${formatPhone(s.parentPhone)}` : undefined,
                  })
                }
              >
                <BellRing className="size-4" /> {t.debts.sendReminder}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => s && setPaymentFor(s)}>
                <CreditCard className="size-4" /> {t.students.actions.payment}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/students/${d.studentId}`}>
                  <Eye className="size-4" /> {t.students.actions.view}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t.debts.title} description={t.debts.subtitle} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard index={0} label={t.debts.totalDebt} value={`${formatCompact(stats.total)} UZS`} icon={WalletMinimal} />
        <StatCard index={1} label={t.debts.overdueAmount} value={`${formatCompact(stats.overdue)} UZS`} icon={AlertTriangle} />
        <StatCard index={2} label={t.debts.debtorCount} value={String(stats.count)} icon={Users} />
        <StatCard index={3} label={t.debts.avgDebt} value={`${formatCompact(stats.avg)} UZS`} icon={Wallet} />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(d) => d.studentId}
        selectable
        loading={loading}
        initialSort={{ id: "debt", desc: true }}
        emptyState={
          <EmptyState icon={Wallet} title={t.debts.empty} description={t.debts.emptyHint} />
        }
        bulkActions={(ids, clear) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              clear();
              toast.success(t.debts.reminderSent, { description: `${ids.length}` });
            }}
          >
            <BellRing className="size-3.5" />
            {t.debts.sendReminder}
          </Button>
        )}
        toolbar={
          <div className="relative w-full max-w-60">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.students.searchPlaceholder}
              aria-label={t.common.search}
              className="h-8 pl-8"
            />
          </div>
        }
      />

      <RecordPaymentDialog
        open={!!paymentFor}
        onOpenChange={(o) => !o && setPaymentFor(null)}
        student={paymentFor}
        onRecorded={({ studentId, amount }) => {
          setItems((prev) =>
            prev
              .map((d) =>
                d.studentId === studentId
                  ? { ...d, paid: d.paid + amount, debt: Math.max(0, d.debt - amount) }
                  : d
              )
              .filter((d) => d.debt > 0)
          );
        }}
      />
    </div>
  );
}
