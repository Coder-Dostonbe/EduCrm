"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { students } from "@/data";
import { formatUZS, fullName } from "@/lib/format";
import type { PaymentMethod, Student } from "@/types";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** lock the dialog to one student */
  student?: Student | null;
  onRecorded?: (data: { studentId: string; amount: number; method: PaymentMethod }) => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  student,
  onRecorded,
}: RecordPaymentDialogProps) {
  const t = useT();
  const [studentId, setStudentId] = React.useState<string>(student?.id ?? "");
  const [amount, setAmount] = React.useState<string>("");
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Reset when the dialog opens (render-phase adjustment, not an effect).
  const [lastOpened, setLastOpened] = React.useState<string | null>(null);
  const openKey = open ? (student?.id ?? "any") : null;
  if (openKey !== lastOpened) {
    setLastOpened(openKey);
    if (open) {
      setStudentId(student?.id ?? "");
      setAmount(student ? String(student.monthlyFee) : "");
      setMethod("cash");
      setNote("");
    }
  }

  const selected = student ?? students.find((s) => s.id === studentId) ?? null;
  const valid = !!selected && Number(amount) > 0;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid || !selected) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    onRecorded?.({ studentId: selected.id, amount: Number(amount), method });
    toast.success(t.payments.recorded, {
      description: `${fullName(selected)} · ${formatUZS(Number(amount))}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.payments.recordPayment}</DialogTitle>
          <DialogDescription>{t.payments.subtitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.payments.form.student}</Label>
            {student ? (
              <Input value={fullName(student)} disabled />
            ) : (
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="w-full" aria-label={t.payments.form.student}>
                  <SelectValue placeholder={t.payments.form.selectStudent} />
                </SelectTrigger>
                <SelectContent>
                  {students.slice(0, 80).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {fullName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">{t.payments.form.amount}</Label>
              <Input
                id="pay-amount"
                type="number"
                step={10000}
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.payments.method}</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["cash", "card", "transfer", "online"] as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {t.payments.methods[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selected && selected.debt > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/8 px-3 py-2 text-sm">
              {t.students.profile.currentDebt}:{" "}
              <span className="font-semibold text-destructive">{formatUZS(selected.debt)}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pay-note">
              {t.payments.form.note} ({t.common.optional})
            </Label>
            <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
