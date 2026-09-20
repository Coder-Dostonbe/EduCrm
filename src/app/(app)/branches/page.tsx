"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  DoorOpen,
  GraduationCap,
  MapPin,
  Phone,
  Plus,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { branches } from "@/data";
import { formatCompact, formatPhone } from "@/lib/format";

export default function BranchesPage() {
  const t = useT();
  const { loading } = useMockLoading(450);
  const { branchId, setBranchId } = useBranch();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.branches.title}
        description={t.branches.subtitle}
        actions={
          <Button size="sm" onClick={() => toast.info(t.common.comingSoon)}>
            <Plus className="size-4" />
            {t.branches.addBranch}
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <Card className="h-full gap-4 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">EduFlow</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={b.status}
                    label={b.status === "active" ? t.common.active : t.common.inactive}
                  />
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span className="leading-snug">{b.address}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="tabular-nums">{formatPhone(b.phone)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <UserRound className="size-3.5 shrink-0" />
                    {b.manager}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-3 min-[380px]:grid-cols-4">
                  {[
                    { icon: DoorOpen, value: b.rooms, label: t.branches.rooms },
                    { icon: Users, value: b.teachers, label: t.nav.teachers },
                    { icon: GraduationCap, value: b.students, label: t.nav.students },
                    { icon: UsersRound, value: b.groups, label: t.nav.groups },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <s.icon className="mx-auto size-3.5 text-muted-foreground" />
                      <p className="mt-1 text-sm font-semibold tabular-nums">{s.value}</p>
                      <p className="text-[10px] leading-tight text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t.branches.revenue}</p>
                    <p className="text-sm font-semibold text-primary tabular-nums">
                      {formatCompact(b.monthlyRevenue)} UZS
                      <span className="text-xs font-normal text-muted-foreground">
                        {t.common.perMonth}
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={branchId === b.id ? "default" : "outline"}
                    onClick={() => {
                      setBranchId(b.id);
                      toast.success(`${t.common.selectBranch}: ${b.name}`);
                    }}
                  >
                    {branchId === b.id ? t.common.active : t.common.open}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
