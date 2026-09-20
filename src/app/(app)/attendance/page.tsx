"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import { CheckCheck, ClipboardCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  attendanceRecords,
  groups,
  students,
  teachers,
} from "@/data";
import { formatDate, fullName, initials } from "@/lib/format";
import type { AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["present", "late", "absent", "excused"];

const statusColors: Record<AttendanceStatus, string> = {
  present: "bg-success text-white border-success",
  late: "bg-warning text-warning-foreground border-warning",
  absent: "bg-destructive text-white border-destructive",
  excused: "bg-info text-white border-info",
};

export default function AttendancePage() {
  const t = useT();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(450);

  const visibleGroups = React.useMemo(
    () =>
      groups.filter(
        (g) => g.status === "active" && (role !== "teacher" || g.teacherId === user?.id)
      ),
    [role, user]
  );

  const [groupIdState, setGroupId] = React.useState<string>("");
  // Derived: fall back to the first visible group so the page never paints empty.
  const groupId = groupIdState || visibleGroups[0]?.id || "";
  const [date, setDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [marks, setMarks] = React.useState<Record<string, AttendanceStatus>>({});

  const [saving, setSaving] = React.useState(false);

  const group = groups.find((g) => g.id === groupId);
  const groupStudents = students.filter((s) => s.groupId === groupId && s.status === "active");

  // Prefill marks from existing records whenever group or date changes
  const prefillKey = `${groupId}|${date}`;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  if (loadedKey !== prefillKey) {
    const existing = attendanceRecords.filter((a) => a.groupId === groupId && a.date === date);
    const map: Record<string, AttendanceStatus> = {};
    for (const rec of existing) map[rec.studentId] = rec.status;
    setLoadedKey(prefillKey);
    setMarks(map);
  }

  const setMark = (studentId: string, status: AttendanceStatus) =>
    setMarks((prev) => ({ ...prev, [studentId]: status }));

  const markedCount = groupStudents.filter((s) => marks[s.id]).length;

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success(t.attendance.saved, {
      description: `${group?.name} · ${formatDate(date)}`,
    });
  };

  // ── Monthly stats ──────────────────────────────────────────────────
  const last30 = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const recent = attendanceRecords.filter((a) => a.date >= last30);

  const groupStats = visibleGroups
    .map((g) => {
      const recs = recent.filter((a) => a.groupId === g.id);
      const present = recs.filter((a) => a.status === "present" || a.status === "late").length;
      return {
        group: g,
        total: recs.length,
        rate: recs.length ? Math.round((present / recs.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate);

  const teacherStats = teachers
    .filter((x) => x.status !== "inactive" && (role !== "teacher" || x.id === user?.id))
    .map((x) => {
      const tGroups = groups.filter((g) => g.teacherId === x.id).map((g) => g.id);
      const recs = recent.filter((a) => tGroups.includes(a.groupId));
      const present = recs.filter((a) => a.status === "present" || a.status === "late").length;
      return {
        teacher: x,
        total: recs.length,
        rate: recs.length ? Math.round((present / recs.length) * 100) : 0,
      };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.rate - a.rate);

  const overall = (() => {
    const present = recent.filter((a) => a.status === "present" || a.status === "late").length;
    return recent.length ? Math.round((present / recent.length) * 1000) / 10 : 0;
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t.attendance.title} description={t.attendance.subtitle} />

      <Tabs defaultValue="daily">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="daily">{t.attendance.daily}</TabsTrigger>
            <TabsTrigger value="stats">{t.attendance.monthlyStats}</TabsTrigger>
          </TabsList>
        </div>

        {/* DAILY MARKING */}
        <TabsContent value="daily" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger size="sm" className="w-auto min-w-44" aria-label={t.attendance.selectGroup}>
                <SelectValue placeholder={t.attendance.selectGroup} />
              </SelectTrigger>
              <SelectContent>
                {visibleGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-auto"
              aria-label={t.attendance.selectDate}
            />
            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const all: Record<string, AttendanceStatus> = {};
                  for (const s of groupStudents) all[s.id] = "present";
                  setMarks(all);
                }}
              >
                <CheckCheck className="size-4" />
                {t.attendance.markAll}
              </Button>
              <Button size="sm" onClick={save} disabled={saving || markedCount === 0}>
                <Save className="size-4" />
                {t.attendance.saveAttendance}
              </Button>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={3} />
          ) : !group || groupStudents.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={t.attendance.empty}
              description={t.attendance.emptyHint}
            />
          ) : (
            <Card className="gap-0 py-0">
              <CardHeader className="flex items-center justify-between border-b !py-3.5 px-5">
                <CardTitle className="text-sm">
                  {group.name} · {formatDate(date, "EEEE, dd MMM yyyy")}
                </CardTitle>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {markedCount}/{groupStudents.length}
                </span>
              </CardHeader>
              <CardContent className="divide-y px-0">
                {groupStudents.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                        {initials(fullName(s))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{fullName(s)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {t.attendance.rate}: {s.attendanceRate}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setMark(s.id, status)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                            marks[s.id] === status
                              ? statusColors[status]
                              : "bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                          )}
                        >
                          {t.attendance[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats" className="mt-4 space-y-4">
          <Card className="gap-3 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t.dashboard.attendanceRate} · {t.periods.d30}</p>
              <span className="text-xl font-semibold text-success tabular-nums">{overall}%</span>
            </div>
            <Progress value={overall} className="h-2" />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.attendance.byGroup}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 px-5">
                {groupStats.map(({ group: g, rate, total }) => (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{g.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {total} · <span className={cn("font-semibold", rate >= 90 ? "text-success" : rate >= 80 ? "text-warning" : "text-destructive")}>{rate}%</span>
                      </span>
                    </div>
                    <Progress value={rate} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.attendance.byTeacher}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="space-y-1">
                  {teacherStats.map(({ teacher, rate, total }) => (
                    <div key={teacher.id} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                          {initials(fullName(teacher))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{fullName(teacher)}</p>
                        <p className="text-xs text-muted-foreground">{teacher.specialization}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
                      <StatusBadge
                        withDot={false}
                        status={rate >= 90 ? "present" : rate >= 80 ? "late" : "absent"}
                        label={`${rate}%`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
