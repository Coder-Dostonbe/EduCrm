"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Search, Star, Users } from "lucide-react";
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
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { teachers } from "@/data";
import { formatPhone, formatUZS, fullName, initials } from "@/lib/format";
import { exportCSV } from "@/lib/export";
import type { Teacher } from "@/types";
import { cn } from "@/lib/utils";

export default function TeachersPage() {
  const t = useT();
  const router = useRouter();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers.filter((x) => {
      if (branchId !== "all" && x.branchId !== branchId) return false;
      if (statusFilter !== "all" && x.status !== statusFilter) return false;
      if (q && !`${x.firstName} ${x.lastName} ${x.specialization}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [branchId, query, statusFilter]);

  const columns: DataTableColumn<Teacher>[] = [
    {
      id: "name",
      header: t.common.teacher,
      hideable: false,
      sortAccessor: (x) => fullName(x),
      cell: (x) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {initials(fullName(x))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName(x)}</p>
            <p className="truncate text-xs text-muted-foreground">{formatPhone(x.phone)}</p>
          </div>
        </div>
      ),
    },
    {
      id: "specialization",
      header: t.teachers.specialization,
      sortAccessor: (x) => x.specialization,
      cell: (x) => x.specialization,
    },
    {
      id: "groups",
      header: t.teachers.groups,
      sortAccessor: (x) => x.groupIds.length,
      cell: (x) => <span className="tabular-nums">{x.groupIds.length}</span>,
    },
    {
      id: "students",
      header: t.teachers.studentsCol,
      sortAccessor: (x) => x.studentCount,
      cell: (x) => <span className="tabular-nums">{x.studentCount}</span>,
    },
    {
      id: "attendance",
      header: t.nav.attendance,
      sortAccessor: (x) => x.attendanceRate,
      cell: (x) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            x.attendanceRate >= 90 ? "text-success" : x.attendanceRate >= 85 ? "text-warning" : "text-destructive"
          )}
        >
          {x.attendanceRate}%
        </span>
      ),
    },
    {
      id: "salary",
      header: t.teachers.salary,
      sortAccessor: (x) => x.baseSalary,
      cell: (x) => <span className="whitespace-nowrap tabular-nums">{formatUZS(x.baseSalary)}</span>,
    },
    {
      id: "rating",
      header: t.common.rating,
      sortAccessor: (x) => x.rating,
      cell: (x) => (
        <span className="flex items-center gap-1 font-medium tabular-nums">
          <Star className="size-3.5 fill-warning text-warning" />
          {x.rating.toFixed(1)}
        </span>
      ),
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (x) => x.status,
      cell: (x) => (
        <StatusBadge
          status={x.status}
          label={
            x.status === "active"
              ? t.common.active
              : x.status === "vacation"
                ? t.teachers.onVacation
                : t.common.inactive
          }
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.teachers.title}
        description={t.teachers.subtitle}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportCSV(
                  "teachers",
                  [t.common.teacher, t.teachers.specialization, t.teachers.groups, t.teachers.studentsCol, t.teachers.salary, t.common.rating],
                  filtered.map((x) => [
                    fullName(x), x.specialization, x.groupIds.length, x.studentCount, x.baseSalary, x.rating,
                  ])
                );
                toast.success(t.reports.exported);
              }}
            >
              <Download className="size-4" />
              {t.common.export}
            </Button>
            <Button size="sm" onClick={() => toast.info(t.common.comingSoon)}>
              <Plus className="size-4" />
              {t.teachers.addTeacher}
            </Button>
          </>
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(x) => x.id}
        loading={loading}
        onRowClick={(x) => router.push(`/teachers/${x.id}`)}
        emptyState={
          <EmptyState icon={Users} title={t.teachers.empty} description={t.teachers.emptyHint} />
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
                <SelectItem value="active">{t.common.active}</SelectItem>
                <SelectItem value="vacation">{t.teachers.onVacation}</SelectItem>
                <SelectItem value="inactive">{t.common.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
