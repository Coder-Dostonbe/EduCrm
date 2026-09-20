"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Banknote,
  CalendarCheck,
  CreditCard,
  Download,
  Plus,
  Printer,
  Search,
  TrendingUp,
  WalletMinimal,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { payments as seedPayments, studentById, debts } from "@/data";
import { formatDateShort, formatCompact, formatUZS, fullName } from "@/lib/format";
import { exportCSV } from "@/lib/export";
import type { Payment, PaymentMethod } from "@/types";

export default function PaymentsPage() {
  const t = useT();
  const { user, role } = useAuth();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);

  const [items, setItems] = React.useState<Payment[]>(seedPayments);
  const [query, setQuery] = React.useState("");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [recordOpen, setRecordOpen] = React.useState(false);

  const isStudent = role === "student";
  const asStudent = isStudent ? studentForUser(user) : null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      // Fail closed: without a matched student record there is nothing this
      // person is entitled to see here.
      if (isStudent && p.studentId !== asStudent?.id) return false;
      if (branchId !== "all" && p.branchId !== branchId) return false;
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q) {
        const s = studentById.get(p.studentId);
        const hay = `${p.invoiceNo} ${s ? fullName(s) : ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, isStudent, asStudent, branchId, query, methodFilter, statusFilter]);

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = today.slice(0, 8) + "01";
  const scoped = branchId === "all" ? items : items.filter((p) => p.branchId === branchId);

  const stats = React.useMemo(() => {
    const paid = scoped.filter((p) => p.status === "paid");
    const todayIncome = paid.filter((p) => p.date === today).reduce((s, p) => s + p.amount, 0);
    const monthIncome = paid.filter((p) => p.date >= monthStart).reduce((s, p) => s + p.amount, 0);
    const collected = monthIncome;
    const expected = Math.round(monthIncome * 1.22);
    const outstanding = debts.reduce((s, d) => s + d.debt, 0);
    const overdue = scoped.filter((p) => p.status === "overdue").length +
      debts.filter((d) => d.overdueDays > 0).length;
    return { todayIncome, monthIncome, expected, collected, outstanding, overdue };
  }, [scoped, today, monthStart]);

  const allColumns: DataTableColumn<Payment>[] = [
    // A student's table is entirely their own rows, so their name in every
    // one of them is noise; the invoice number is what identifies a payment.
    ...(isStudent
      ? [
          {
            id: "invoice",
            header: t.payments.invoice,
            hideable: false,
            sortAccessor: (p: Payment) => p.invoiceNo,
            cell: (p: Payment) => <span className="font-medium">{p.invoiceNo}</span>,
          } satisfies DataTableColumn<Payment>,
        ]
      : []),
    {
      id: "student",
      header: t.payments.form.student,
      hideable: false,
      sortAccessor: (p) => {
        const s = studentById.get(p.studentId);
        return s ? fullName(s) : "";
      },
      cell: (p) => {
        const s = studentById.get(p.studentId);
        return (
          <div>
            <p className="font-medium">{s ? fullName(s) : "—"}</p>
            <p className="text-xs text-muted-foreground">{p.invoiceNo}</p>
          </div>
        );
      },
    },
    {
      id: "amount",
      header: t.common.amount,
      sortAccessor: (p) => p.amount,
      cell: (p) => (
        <span className="font-semibold whitespace-nowrap tabular-nums">{formatUZS(p.amount)}</span>
      ),
    },
    {
      id: "method",
      header: t.payments.method,
      sortAccessor: (p) => p.method,
      cell: (p) => t.payments.methods[p.method],
    },
    {
      id: "date",
      header: t.common.date,
      sortAccessor: (p) => p.date,
      cell: (p) => <span className="tabular-nums">{formatDateShort(p.date)}</span>,
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (p) => p.status,
      cell: (p) => <StatusBadge status={p.status} label={t.payments.status[p.status]} />,
    },
    {
      id: "cashier",
      header: t.payments.cashier,
      defaultHidden: true,
      cell: (p) => p.cashier,
    },
    {
      id: "actions",
      header: "",
      hideable: false,
      className: "w-10 text-right",
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t.common.actions}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => toast.success(`${t.payments.receipt}: ${p.invoiceNo}`)}>
              <Printer className="size-4" /> {t.payments.receipt}
            </DropdownMenuItem>
            {!isStudent && p.status !== "cancelled" && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setItems((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, status: "cancelled" } : x))
                  );
                  toast.success(t.payments.status.cancelled);
                }}
              >
                <XCircle className="size-4" /> {t.common.cancel}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Whose payment it is and who took the money are staff concerns.
  const columns = allColumns.filter(
    (c) => !(isStudent && (c.id === "student" || c.id === "cashier"))
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={isStudent ? t.payments.myTitle : t.payments.title}
        description={isStudent ? t.payments.mySubtitle : t.payments.subtitle}
        actions={
          !isStudent ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportCSV(
                    "payments",
                    [t.payments.form.student, t.payments.invoice, t.common.amount, t.payments.method, t.common.date, t.common.status],
                    filtered.map((p) => {
                      const s = studentById.get(p.studentId);
                      return [s ? fullName(s) : "", p.invoiceNo, p.amount, t.payments.methods[p.method], p.date, t.payments.status[p.status]];
                    })
                  );
                  toast.success(t.reports.exported);
                }}
              >
                <Download className="size-4" />
                {t.common.export}
              </Button>
              <Button size="sm" onClick={() => setRecordOpen(true)}>
                <Plus className="size-4" />
                {t.payments.recordPayment}
              </Button>
            </>
          ) : undefined
        }
      />

      {!isStudent && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          <StatCard index={0} label={t.payments.todayIncome} value={`${formatCompact(stats.todayIncome)} UZS`} icon={Banknote} />
          <StatCard index={1} label={t.payments.monthIncome} value={`${formatCompact(stats.monthIncome)} UZS`} icon={TrendingUp} change={8.4} />
          <StatCard index={2} label={t.payments.expectedIncome} value={`${formatCompact(stats.expected)} UZS`} icon={CalendarCheck} />
          <StatCard index={3} label={t.payments.collectedIncome} value={`${formatCompact(stats.collected)} UZS`} icon={CreditCard} change={5.1} />
          <StatCard index={4} label={t.payments.outstandingDebt} value={`${formatCompact(stats.outstanding)} UZS`} icon={WalletMinimal} change={-3.6} invertTrend />
          <StatCard index={5} label={t.payments.overduePayments} value={String(stats.overdue)} icon={XCircle} change={-8} invertTrend />
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(p) => p.id}
        selectable={!isStudent}
        loading={loading}
        initialSort={{ id: "date", desc: true }}
        emptyState={
          <EmptyState icon={CreditCard} title={t.payments.empty} description={t.payments.emptyHint} />
        }
        bulkActions={(ids, clear) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              const rows = items.filter((p) => ids.includes(p.id));
              exportCSV(
                "payments-selected",
                [t.payments.invoice, t.common.amount, t.common.date, t.common.status],
                rows.map((p) => [p.invoiceNo, p.amount, p.date, p.status])
              );
              clear();
              toast.success(t.reports.exported);
            }}
          >
            <Download className="size-3.5" />
            {t.common.export}
          </Button>
        )}
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
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.payments.method}</SelectItem>
                {(["cash", "card", "transfer", "online"] as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>{t.payments.methods[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.common.status}</SelectItem>
                {(["paid", "pending", "partial", "overdue", "cancelled"] as const).map((s) => (
                  <SelectItem key={s} value={s}>{t.payments.status[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onRecorded={({ studentId, amount, method }) => {
          const s = studentById.get(studentId);
          setItems((prev) => [
            {
              id: `p-new-${Date.now()}`,
              invoiceNo: `INV-2026-${String(prev.length + 1).padStart(4, "0")}`,
              studentId,
              amount,
              method,
              date: today,
              status: "paid",
              cashier: user?.name ?? "—",
              branchId: s?.branchId ?? "br-1",
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}
