"use client";

import * as React from "react";
import { Loader2, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { useT } from "@/lib/i18n";
import { courses } from "@/data";
import { formatDate, formatPhone, formatUZS } from "@/lib/format";
import type { Lead, LeadPriority, LeadSource } from "@/types";

const phoneRegex = /^\+998\d{9}$/;

const leadSchema = z.object({
  name: z.string().min(3),
  phone: z.string().regex(phoneRegex),
  source: z.enum(["instagram", "telegram", "referral", "website", "walk-in", "ads"]),
  courseInterest: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  manager: z.string().min(2),
  nextContactDate: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

const SOURCES: LeadSource[] = ["instagram", "telegram", "referral", "website", "walk-in", "ads"];
const PRIORITIES: LeadPriority[] = ["high", "medium", "low"];
const MANAGERS = ["Gavhar Po'latova", "Nilufar Karimova", "Otabek Nazarov"];

export function AddLeadDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (values: LeadFormValues) => void;
}) {
  const t = useT();
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "+998",
      source: "instagram",
      courseInterest: courses[0]?.name ?? "",
      priority: "medium",
      manager: MANAGERS[0],
      nextContactDate: "",
    },
  });

  // Clear the form each time the dialog opens (render-phase adjustment).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) form.reset();
  }

  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    await new Promise((r) => setTimeout(r, 500));
    onCreate(values);
    toast.success(t.leads.created);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.leads.addLead}</DialogTitle>
          <DialogDescription>{t.leads.subtitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">{t.common.name}</Label>
              <Input id="lead-name" aria-invalid={!!errors.name} {...form.register("name")} />
              {errors.name && <p className="text-xs text-destructive">{t.validation.required}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">{t.common.phone}</Label>
              <Input id="lead-phone" placeholder="+998901234567" aria-invalid={!!errors.phone} {...form.register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{t.validation.invalidPhone}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t.leads.source}</Label>
              <Select
                value={form.watch("source")}
                onValueChange={(v) => form.setValue("source", v as LeadSource)}
              >
                <SelectTrigger className="w-full" aria-label={t.leads.source}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{t.leads.sources[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.leads.courseInterest}</Label>
              <Select
                value={form.watch("courseInterest")}
                onValueChange={(v) => form.setValue("courseInterest", v)}
              >
                <SelectTrigger className="w-full" aria-label={t.leads.courseInterest}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t.leads.priorityLabel}</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v as LeadPriority)}
              >
                <SelectTrigger className="w-full" aria-label={t.leads.priorityLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{t.leads.priority[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.leads.manager}</Label>
              <Select
                value={form.watch("manager")}
                onValueChange={(v) => form.setValue("manager", v)}
              >
                <SelectTrigger className="w-full" aria-label={t.leads.manager}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANAGERS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-next">{t.leads.nextContact} ({t.common.optional})</Label>
            <Input id="lead-next" type="date" {...form.register("nextContactDate")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LeadDetailsSheet({
  lead,
  onOpenChange,
  onAddNote,
  onConvert,
}: {
  lead: Lead | null;
  onOpenChange: (o: boolean) => void;
  onAddNote: (leadId: string, text: string) => void;
  onConvert: (leadId: string) => void;
}) {
  const t = useT();
  const [note, setNote] = React.useState("");

  const [noteFor, setNoteFor] = React.useState<string | null>(lead?.id ?? null);
  if ((lead?.id ?? null) !== noteFor) {
    setNoteFor(lead?.id ?? null);
    setNote("");
  }

  if (!lead) return null;

  return (
    <Sheet open={!!lead} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.name}
            <StatusBadge status={lead.priority} label={t.leads.priority[lead.priority]} withDot={false} />
          </SheetTitle>
          <SheetDescription>
            {formatPhone(lead.phone)} · {t.leads.sources[lead.source]}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 pb-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.info(`${t.leads.call}: ${formatPhone(lead.phone)}`)}>
              <Phone className="size-4" />
              {t.leads.call}
            </Button>
            {lead.stage !== "enrolled" && lead.stage !== "lost" && (
              <Button size="sm" className="flex-1" onClick={() => onConvert(lead.id)}>
                <UserPlus className="size-4" />
                {t.leads.convert}
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.leads.courseInterest}</span>
              <span className="font-medium">{lead.courseInterest}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.leads.expectedValue}</span>
              <span className="font-medium tabular-nums">{formatUZS(lead.expectedValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.leads.manager}</span>
              <span className="font-medium">{lead.manager}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.status}</span>
              <span className="font-medium">{t.leads.stages[lead.stage]}</span>
            </div>
            {lead.nextContactDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.leads.nextContact}</span>
                <span className="font-medium tabular-nums">{formatDate(lead.nextContactDate)}</span>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground uppercase">
              {t.leads.communicationHistory}
            </p>
            {lead.notes.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">{t.common.none}</p>
            ) : (
              <div className="space-y-3">
                {lead.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border p-3">
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {n.author} · {formatDate(n.date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-note">{t.leads.addNote}</Label>
            <Textarea
              id="lead-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.leads.notePlaceholder}
            />
            <Button
              size="sm"
              disabled={!note.trim()}
              onClick={() => {
                onAddNote(lead.id, note.trim());
                setNote("");
                toast.success(t.leads.noteAdded);
              }}
            >
              {t.common.save}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
