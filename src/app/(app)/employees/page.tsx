"use client";

import * as React from "react";
import { Contact, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { branchById, employees } from "@/data";
import { formatDateShort, formatPhone, formatUZS, initials } from "@/lib/format";
import type { Employee } from "@/types";

export default function EmployeesPage() {
  const t = useT();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(450);
  const [query, setQuery] = React.useState("");

  const filtered = employees.filter((e) => {
    if (branchId !== "all" && e.branchId !== branchId) return false;
    if (query && !`${e.name} ${e.role}`.toLowerCase().includes(query.trim().toLowerCase()))
      return false;
    return true;
  });

  const columns: DataTableColumn<Employee>[] = [
    {
      id: "name",
      header: t.salaries.employee,
      hideable: false,
      sortAccessor: (e) => e.name,
      cell: (e) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {initials(e.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{e.name}</p>
            <p className="truncate text-xs text-muted-foreground">{e.role}</p>
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: t.common.phone,
      cell: (e) => <span className="whitespace-nowrap tabular-nums">{formatPhone(e.phone)}</span>,
    },
    { id: "email", header: t.common.email, cell: (e) => e.email },
    {
      id: "branch",
      header: t.nav.branches,
      cell: (e) => branchById.get(e.branchId)?.name ?? "—",
    },
    {
      id: "hireDate",
      header: t.teachers.hired,
      sortAccessor: (e) => e.hireDate,
      cell: (e) => <span className="tabular-nums">{formatDateShort(e.hireDate)}</span>,
    },
    {
      id: "salary",
      header: t.teachers.salary,
      sortAccessor: (e) => e.salary,
      cell: (e) => <span className="whitespace-nowrap tabular-nums">{formatUZS(e.salary)}</span>,
    },
    {
      id: "status",
      header: t.common.status,
      cell: (e) => (
        <StatusBadge
          status={e.status}
          label={e.status === "active" ? t.common.active : t.common.inactive}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.nav.employees}
        description={t.settings.subtitle}
        actions={
          <Button size="sm" onClick={() => toast.info(t.common.comingSoon)}>
            <Plus className="size-4" />
            {t.common.add}
          </Button>
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(e) => e.id}
        loading={loading}
        emptyState={<EmptyState icon={Contact} title={t.common.noResults} />}
        toolbar={
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
        }
      />
    </div>
  );
}
