"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Ban,
  ClipboardCheck,
  CreditCard,
  Download,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  WalletMinimal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentFormSheet, type StudentFormValues } from "@/components/students/student-form";
import { ChangeGroupDialog } from "@/components/students/change-group-dialog";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { students as seedStudents, courses, groups, courseById, groupById } from "@/data";
import {
  formatDateShort,
  formatPhone,
  formatUZS,
  fullName,
  initials,
} from "@/lib/format";
import { exportCSV } from "@/lib/export";
import type { Student } from "@/types";
import { cn } from "@/lib/utils";

export default function StudentsPage() {
  const t = useT();
  const router = useRouter();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);

  const [items, setItems] = React.useState<Student[]>(seedStudents);
  const [query, setQuery] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Student | null>(null);
  const [deleting, setDeleting] = React.useState<Student | null>(null);
  const [paymentFor, setPaymentFor] = React.useState<Student | null>(null);
  const [changingGroup, setChangingGroup] = React.useState<Student | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (branchId !== "all" && s.branchId !== branchId) return false;
      if (courseFilter !== "all" && s.courseId !== courseFilter) return false;
      if (groupFilter !== "all" && s.groupId !== groupFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (paymentFilter !== "all" && s.paymentStatus !== paymentFilter) return false;
      if (q) {
        const hay = `${s.firstName} ${s.lastName} ${s.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, branchId, query, courseFilter, groupFilter, statusFilter, paymentFilter]);

  const stats = React.useMemo(() => {
    const scoped = branchId === "all" ? items : items.filter((s) => s.branchId === branchId);
    return {
      total: scoped.length,
      active: scoped.filter((s) => s.status === "active").length,
      inactive: scoped.filter((s) => s.status !== "active").length,
      debtors: scoped.filter((s) => s.debt > 0).length,
    };
  }, [items, branchId]);

  const handleExport = (rows: Student[]) => {
    exportCSV(
      "students",
      [t.students.columns.student, t.common.phone, t.students.columns.course, t.students.columns.groupCol, t.students.columns.attendance, t.students.columns.debt, t.common.status],
      rows.map((s) => [
        fullName(s),
        s.phone,
        courseById.get(s.courseId)?.name ?? "",
        groupById.get(s.groupId)?.name ?? "",
        `${s.attendanceRate}%`,
        s.debt,
        t.students.status[s.status],
      ])
    );
    toast.success(t.reports.exported);
  };

  const upsertStudent = (values: StudentFormValues) => {
    if (editing) {
      setItems((prev) =>
        prev.map((s) =>
          s.id === editing.id
            ? { ...s, ...values, email: values.email || undefined, notes: values.notes || undefined }
            : s
        )
      );
      toast.success(t.students.form.updated);
    } else {
      const group = groupById.get(values.groupId);
      const newStudent: Student = {
        id: `s-new-${Date.now()}`,
        ...values,
        email: values.email || undefined,
        notes: values.notes || undefined,
        branchId: group?.branchId ?? "br-1",
        status: "active",
        attendanceRate: 100,
        paymentStatus: "pending",
        debt: values.monthlyFee,
        performance: 0,
      };
      setItems((prev) => [newStudent, ...prev]);
      toast.success(t.students.form.created);
    }
    setEditing(null);
  };

  const columns: DataTableColumn<Student>[] = [
    {
      id: "student",
      header: t.students.columns.student,
      hideable: false,
      sortAccessor: (s) => fullName(s),
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {initials(fullName(s))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName(s)}</p>
            <p className="truncate text-xs text-muted-foreground">{s.id.toUpperCase()}</p>
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: t.common.phone,
      cell: (s) => <span className="tabular-nums whitespace-nowrap">{formatPhone(s.phone)}</span>,
    },
    {
      id: "course",
      header: t.students.columns.course,
      sortAccessor: (s) => courseById.get(s.courseId)?.name ?? "",
      cell: (s) => courseById.get(s.courseId)?.name ?? "—",
    },
    {
      id: "group",
      header: t.students.columns.groupCol,
      sortAccessor: (s) => groupById.get(s.groupId)?.name ?? "",
      cell: (s) => (
        <span className="whitespace-nowrap">{groupById.get(s.groupId)?.name ?? "—"}</span>
      ),
    },
    {
      id: "attendance",
      header: t.students.columns.attendance,
      sortAccessor: (s) => s.attendanceRate,
      cell: (s) => (
        <div className="flex min-w-24 items-center gap-2">
          <Progress value={s.attendanceRate} className="h-1.5 w-14" />
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              s.attendanceRate >= 90
                ? "text-success"
                : s.attendanceRate >= 80
                  ? "text-warning"
                  : "text-destructive"
            )}
          >
            {s.attendanceRate}%
          </span>
        </div>
      ),
    },
    {
      id: "payment",
      header: t.students.columns.payment,
      sortAccessor: (s) => s.paymentStatus,
      cell: (s) => (
        <StatusBadge status={s.paymentStatus} label={t.payments.status[s.paymentStatus]} />
      ),
    },
    {
      id: "debt",
      header: t.students.columns.debt,
      sortAccessor: (s) => s.debt,
      cell: (s) =>
        s.debt > 0 ? (
          <span className="font-medium whitespace-nowrap text-destructive tabular-nums">
            {formatUZS(s.debt)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "registered",
      header: t.students.columns.registered,
      defaultHidden: true,
      sortAccessor: (s) => s.enrollmentDate,
      cell: (s) => (
        <span className="whitespace-nowrap tabular-nums">{formatDateShort(s.enrollmentDate)}</span>
      ),
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (s) => s.status,
      cell: (s) => <StatusBadge status={s.status} label={t.students.status[s.status]} />,
    },
    {
      id: "actions",
      header: "",
      hideable: false,
      className: "w-10 text-right",
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={(e) => e.stopPropagation()}
              aria-label={t.common.actions}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem asChild>
              <Link href={`/students/${s.id}`}>
                <Eye className="size-4" /> {t.students.actions.view}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditing(s);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> {t.students.actions.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPaymentFor(s)}>
              <CreditCard className="size-4" /> {t.students.actions.payment}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/attendance">
                <ClipboardCheck className="size-4" /> {t.students.actions.attendance}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChangingGroup(s)}>
              <ArrowRightLeft className="size-4" /> {t.students.actions.changeGroup}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setItems((prev) =>
                  prev.map((x) =>
                    x.id === s.id
                      ? { ...x, status: x.status === "active" ? "inactive" : "active" }
                      : x
                  )
                );
                toast.success(s.status === "active" ? t.students.deactivated : t.students.form.updated);
              }}
            >
              {s.status === "active" ? (
                <>
                  <Ban className="size-4" /> {t.students.actions.deactivate}
                </>
              ) : (
                <>
                  <UserCheck className="size-4" /> {t.common.active}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(s)}>
              <Trash2 className="size-4" /> {t.students.actions.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.students.title}
        description={t.students.subtitle}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => handleExport(filtered)}>
              <Download className="size-4" />
              {t.common.export}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t.students.addStudent}
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t.students.totalStudents, value: stats.total, icon: GraduationCap, cls: "text-primary bg-primary/8" },
          { label: t.students.activeStudents, value: stats.active, icon: UserCheck, cls: "text-success bg-success/10" },
          { label: t.students.inactiveStudents, value: stats.inactive, icon: UserX, cls: "text-muted-foreground bg-muted" },
          { label: t.students.debtors, value: stats.debtors, icon: WalletMinimal, cls: "text-destructive bg-destructive/10" },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <div className={cn("flex size-9 items-center justify-center rounded-md", card.cls)}>
              <card.icon className="size-4.5" />
            </div>
            <div>
              <p className="text-xl leading-none font-semibold tabular-nums">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(s) => s.id}
        selectable
        loading={loading}
        initialSort={{ id: "registered", desc: true }}
        onRowClick={(s) => router.push(`/students/${s.id}`)}
        emptyState={
          <EmptyState
            icon={GraduationCap}
            title={query || courseFilter !== "all" ? t.common.noResults : t.students.empty}
            description={query || courseFilter !== "all" ? undefined : t.students.emptyHint}
            action={
              query || courseFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setCourseFilter("all");
                    setGroupFilter("all");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                  }}
                >
                  {t.common.clearFilters}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  {t.students.addStudent}
                </Button>
              )
            }
          />
        }
        bulkActions={(ids, clear) => (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleExport(items.filter((s) => ids.includes(s.id)))}
            >
              <Download className="size-3.5" />
              {t.common.export}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setItems((prev) =>
                  prev.map((s) => (ids.includes(s.id) ? { ...s, status: "inactive" } : s))
                );
                clear();
                toast.success(t.students.deactivated);
              }}
            >
              <Ban className="size-3.5" />
              {t.students.actions.deactivate}
            </Button>
          </>
        )}
        toolbar={
          <>
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
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.common.course}</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.common.group}</SelectItem>
                {groups
                  .filter((g) => courseFilter === "all" || g.courseId === courseFilter)
                  .map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.common.status}</SelectItem>
                {(["active", "inactive", "graduated", "suspended"] as const).map((s) => (
                  <SelectItem key={s} value={s}>{t.students.status[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.students.columns.payment}</SelectItem>
                {(["paid", "pending", "partial", "overdue"] as const).map((s) => (
                  <SelectItem key={s} value={s}>{t.payments.status[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Dialogs & sheets */}
      <StudentFormSheet
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        student={editing}
        onSubmit={upsertStudent}
      />
      <RecordPaymentDialog
        open={!!paymentFor}
        onOpenChange={(o) => !o && setPaymentFor(null)}
        student={paymentFor}
        onRecorded={({ studentId, amount }) => {
          setItems((prev) =>
            prev.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    debt: Math.max(0, s.debt - amount),
                    paymentStatus: amount >= s.debt ? "paid" : "partial",
                  }
                : s
            )
          );
        }}
      />
      <ChangeGroupDialog
        open={!!changingGroup}
        onOpenChange={(o) => !o && setChangingGroup(null)}
        student={changingGroup}
        onChanged={(studentId, groupId) => {
          const g = groupById.get(groupId);
          setItems((prev) =>
            prev.map((s) =>
              s.id === studentId
                ? { ...s, groupId, courseId: g?.courseId ?? s.courseId, branchId: g?.branchId ?? s.branchId }
                : s
            )
          );
        }}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.students.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${fullName(deleting)} — ` : ""}
              {t.students.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  setItems((prev) => prev.filter((s) => s.id !== deleting.id));
                  toast.success(t.students.deleted);
                }
                setDeleting(null);
              }}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
