"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AvatarPicker } from "@/components/shared/avatar-picker";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { branchById, courseById, groupById } from "@/data";
import { formatDateShort, formatPhone, formatUZS } from "@/lib/format";

export default function ProfilePage() {
  const t = useT();
  const router = useRouter();
  const { user, role } = useAuth();

  const asStudent = role === "student" ? studentForUser(user) : null;

  if (!user) return null;

  const group = asStudent ? groupById.get(asStudent.groupId) : undefined;
  const course = asStudent ? courseById.get(asStudent.courseId) : undefined;

  const accountRows: [string, string][] = [
    [t.auth.fullName, user.name],
    [t.common.email, user.email],
    [t.settings.role, role ? t.roles[role] : "—"],
    [t.nav.branches, branchById.get(user.branchId)?.name ?? "—"],
  ];

  // Students carry a second identity in the system — the enrolment behind the
  // account — and this is the only page of their own that shows it.
  const studyRows: [string, string][] = asStudent
    ? [
        [t.students.form.course, course?.name ?? "—"],
        [t.students.form.group, group?.name ?? "—"],
        [t.common.phone, formatPhone(asStudent.phone)],
        [t.students.form.enrollmentDate, formatDateShort(asStudent.enrollmentDate)],
        [t.students.form.monthlyFee, formatUZS(asStudent.monthlyFee)],
        [t.students.profile.currentDebt, formatUZS(asStudent.debt)],
        [t.students.profile.performance, `${asStudent.performance}%`],
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t.common.profile}
        description={t.settings.profileInfo}
        actions={
          <Button size="sm" variant="outline" onClick={() => router.push("/settings")}>
            <Settings className="size-4" />
            {t.common.settings}
          </Button>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <AvatarPicker name={user.name} compact />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <StatusBadge status="active" label={role ? t.roles[role] : ""} />
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </Card>

      <InfoCard title={t.settings.profileInfo} rows={accountRows} />

      {asStudent ? (
        <InfoCard title={t.students.profile.educationInfo} rows={studyRows} />
      ) : null}
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y px-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
