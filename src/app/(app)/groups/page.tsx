"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { useAuth } from "@/lib/auth";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { courseById, courses, groups, teacherById } from "@/data";
import { formatDateShort, fullName } from "@/lib/format";
import type { Group } from "@/types";

export default function GroupsPage() {
  const t = useT();
  const router = useRouter();
  const { branchId } = useBranch();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(500);
  const [query, setQuery] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      // Teachers only see their own groups
      if (role === "teacher" && g.teacherId !== user?.id) return false;
      if (branchId !== "all" && g.branchId !== branchId) return false;
      if (courseFilter !== "all" && g.courseId !== courseFilter) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [branchId, role, user, query, courseFilter, statusFilter]);

  const columns: DataTableColumn<Group>[] = [
    {
      id: "name",
      header: t.common.group,
      hideable: false,
      sortAccessor: (g) => g.name,
      cell: (g) => (
        <div>
          <p className="font-medium">{g.name}</p>
          <p className="text-xs text-muted-foreground">{courseById.get(g.courseId)?.name}</p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: t.common.teacher,
      sortAccessor: (g) => {
        const teacher = teacherById.get(g.teacherId);
        return teacher ? fullName(teacher) : "";
      },
      cell: (g) => {
        const teacher = teacherById.get(g.teacherId);
        return teacher ? fullName(teacher) : "—";
      },
    },
    {
      id: "room",
      header: t.common.room,
      cell: (g) => <span className="whitespace-nowrap">{g.room}</span>,
    },
    {
      id: "schedule",
      header: t.common.schedule,
      cell: (g) => (
        <span className="text-xs whitespace-nowrap">
          {g.schedule.days.map((d) => t.days[d]).join(", ")}
          <span className="block text-muted-foreground">
            {g.schedule.startTime}–{g.schedule.endTime}
          </span>
        </span>
      ),
    },
    {
      id: "students",
      header: t.nav.students,
      sortAccessor: (g) => g.studentIds.length,
      cell: (g) => {
        const fill = Math.round((g.studentIds.length / g.capacity) * 100);
        return (
          <div className="flex min-w-28 items-center gap-2">
            <Progress value={fill} className="h-1.5 w-16" />
            <span className="text-xs tabular-nums">
              {g.studentIds.length}/{g.capacity}
            </span>
          </div>
        );
      },
    },
    {
      id: "startDate",
      header: t.groups.startDate,
      sortAccessor: (g) => g.startDate,
      cell: (g) => <span className="tabular-nums">{formatDateShort(g.startDate)}</span>,
    },
    {
      id: "status",
      header: t.common.status,
      sortAccessor: (g) => g.status,
      cell: (g) => (
        <StatusBadge
          status={g.status}
          label={
            g.status === "active"
              ? t.common.active
              : g.status === "forming"
                ? t.groups.forming
                : t.groups.finished
          }
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={role === "teacher" ? t.nav.myGroups : t.groups.title}
        description={t.groups.subtitle}
        actions={
          role !== "teacher" ? (
            <Button size="sm" onClick={() => toast.info(t.common.comingSoon)}>
              <Plus className="size-4" />
              {t.groups.addGroup}
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(g) => g.id}
        loading={loading}
        onRowClick={(g) => router.push(`/groups/${g.id}`)}
        emptyState={
          <EmptyState icon={UsersRound} title={t.groups.empty} description={t.groups.emptyHint} />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.common.status}</SelectItem>
                <SelectItem value="active">{t.common.active}</SelectItem>
                <SelectItem value="forming">{t.groups.forming}</SelectItem>
                <SelectItem value="finished">{t.groups.finished}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
