"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, Kanban, Phone, Plus, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { AddLeadDialog, LeadDetailsSheet, type LeadFormValues } from "@/components/crm/lead-dialogs";
import { useT } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { courses, leads as seedLeads } from "@/data";
import { formatCompact, formatDate, formatPhone, initials } from "@/lib/format";
import type { Lead, LeadStage } from "@/types";
import { cn } from "@/lib/utils";

const STAGES: LeadStage[] = [
  "new",
  "contacted",
  "interested",
  "trial",
  "negotiation",
  "enrolled",
  "lost",
];

const stageAccent: Record<LeadStage, string> = {
  new: "var(--chart-1)",
  contacted: "var(--chart-4)",
  interested: "var(--chart-2)",
  trial: "var(--chart-3)",
  negotiation: "var(--chart-5)",
  enrolled: "var(--success)",
  lost: "var(--destructive)",
};

const priorityDot: Record<Lead["priority"], string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground/40",
};

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.9 : 1,
      }}
      className={cn("touch-none", isDragging && "rotate-1")}
    >
      <Card
        {...listeners}
        {...attributes}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={lead.name}
        className={cn(
          "cursor-grab gap-2 p-3 transition-shadow hover:shadow-md active:cursor-grabbing",
          isDragging && "shadow-lg"
        )}
      >
        <div className="flex items-start gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {initials(lead.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-tight font-medium">{lead.name}</p>
            <p className="truncate text-[11px] text-muted-foreground tabular-nums">
              {formatPhone(lead.phone)}
            </p>
          </div>
          <span
            className={cn("mt-1 size-2 shrink-0 rounded-full", priorityDot[lead.priority])}
            title={t.leads.priority[lead.priority]}
          />
        </div>

        <p className="truncate rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {lead.courseInterest}
        </p>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">{t.leads.sources[lead.source]}</span>
          <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
            {formatCompact(lead.expectedValue)}
          </span>
        </div>

        {lead.nextContactDate && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarClock className="size-3" />
            {formatDate(lead.nextContactDate, "dd MMM")}
          </div>
        )}
      </Card>
    </div>
  );
}

function StageColumn({
  stage,
  leads,
  onOpenLead,
}: {
  stage: LeadStage;
  leads: Lead[];
  onOpenLead: (l: Lead) => void;
}) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const value = leads.reduce((s, l) => s + l.expectedValue, 0);

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="size-2 rounded-full" style={{ background: stageAccent[stage] }} />
        <p className="text-[13px] font-semibold">{t.leads.stages[stage]}</p>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {leads.length}
        </span>
        {value > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {formatCompact(value)}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-96 flex-1 flex-col gap-2 rounded-lg border border-dashed bg-muted/25 p-2 transition-colors",
          isOver && "border-primary/50 bg-primary/5"
        )}
      >
        {leads.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">{t.leads.emptyStage}</p>
        ) : (
          leads.map((l) => <LeadCard key={l.id} lead={l} onOpen={() => onOpenLead(l)} />)
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const t = useT();
  const { branchId } = useBranch();
  const { loading } = useMockLoading(500);

  const [items, setItems] = React.useState<Lead[]>(seedLeads);
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const scoped = React.useMemo(
    () => items.filter((l) => branchId === "all" || l.branchId === branchId),
    [items, branchId]
  );

  const stats = React.useMemo(() => {
    const openLeads = scoped.filter((l) => l.stage !== "enrolled" && l.stage !== "lost");
    const enrolled = scoped.filter((l) => l.stage === "enrolled").length;
    const closed = enrolled + scoped.filter((l) => l.stage === "lost").length;
    return {
      total: scoped.length,
      pipelineValue: openLeads.reduce((s, l) => s + l.expectedValue, 0),
      conversion: closed ? Math.round((enrolled / closed) * 100) : 0,
      enrolled,
    };
  }, [scoped]);

  const onDragEnd = (e: DragEndEvent) => {
    const leadId = String(e.active.id);
    const target = e.over ? (String(e.over.id) as LeadStage) : null;
    if (!target || !STAGES.includes(target)) return;
    const lead = items.find((l) => l.id === leadId);
    if (!lead || lead.stage === target) return;
    setItems((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: target } : l)));
    toast.success(`${t.leads.stageChanged} ${t.leads.stages[target]}`, { description: lead.name });
  };

  const createLead = (values: LeadFormValues) => {
    const course = courses.find((c) => c.name === values.courseInterest);
    setItems((prev) => [
      {
        id: `l-new-${Date.now()}`,
        name: values.name,
        phone: values.phone,
        source: values.source,
        courseInterest: values.courseInterest,
        stage: "new",
        priority: values.priority,
        manager: values.manager,
        expectedValue: course ? course.price * course.durationMonths : 2000000,
        nextContactDate: values.nextContactDate || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
        notes: [],
        branchId: branchId === "all" ? "br-1" : branchId,
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title={t.leads.title}
          description={t.leads.subtitle}
          actions={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              {t.leads.addLead}
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <StatCard index={0} label={t.leads.title} value={String(stats.total)} icon={Kanban} />
          <StatCard
            index={1}
            label={t.leads.pipelineValue}
            value={`${formatCompact(stats.pipelineValue)} UZS`}
            icon={Wallet}
          />
          <StatCard
            index={2}
            label={t.leads.conversionRate}
            value={`${stats.conversion}%`}
            icon={TrendingUp}
            change={4.2}
          />
          <StatCard
            index={3}
            label={t.leads.stages.enrolled}
            value={String(stats.enrolled)}
            icon={Phone}
          />
        </div>
      </div>

      {loading ? (
        <ChartSkeleton height={420} />
      ) : scoped.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title={t.leads.emptyStage}
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              {t.leads.addLead}
            </Button>
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6"
        >
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex gap-3">
              {STAGES.map((stage) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  leads={scoped.filter((l) => l.stage === stage)}
                  onOpenLead={setSelected}
                />
              ))}
            </div>
          </DndContext>
        </motion.div>
      )}

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onCreate={createLead} />
      <LeadDetailsSheet
        lead={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onAddNote={(leadId, text) => {
          setItems((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    notes: [
                      ...l.notes,
                      {
                        id: `ln-${Date.now()}`,
                        date: new Date().toISOString().slice(0, 10),
                        author: l.manager,
                        text,
                      },
                    ],
                  }
                : l
            )
          );
          setSelected((prev) =>
            prev && prev.id === leadId
              ? {
                  ...prev,
                  notes: [
                    ...prev.notes,
                    {
                      id: `ln-${Date.now()}`,
                      date: new Date().toISOString().slice(0, 10),
                      author: prev.manager,
                      text,
                    },
                  ],
                }
              : prev
          );
        }}
        onConvert={(leadId) => {
          setItems((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, stage: "enrolled" } : l))
          );
          setSelected(null);
          toast.success(t.students.form.created);
        }}
      />
    </div>
  );
}
