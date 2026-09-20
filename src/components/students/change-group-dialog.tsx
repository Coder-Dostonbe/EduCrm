"use client";

import * as React from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { groups, groupById } from "@/data";
import { fullName } from "@/lib/format";
import type { Student } from "@/types";

interface ChangeGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onChanged: (studentId: string, groupId: string) => void;
}

export function ChangeGroupDialog({ open, onOpenChange, student, onChanged }: ChangeGroupDialogProps) {
  const t = useT();
  const [groupId, setGroupId] = React.useState("");

  // Sync the selection to the student being edited (render-phase adjustment).
  const [lastStudentId, setLastStudentId] = React.useState<string | null>(null);
  if (open && student && student.id !== lastStudentId) {
    setLastStudentId(student.id);
    setGroupId(student.groupId);
  }

  if (!student) return null;
  const current = groupById.get(student.groupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.students.actions.changeGroup}</DialogTitle>
          <DialogDescription>
            {fullName(student)} · {current?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t.common.group}</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groups
                .filter((g) => g.status !== "finished")
                .map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={!groupId || groupId === student.groupId}
            onClick={() => {
              onChanged(student.id, groupId);
              toast.success(t.students.form.updated);
              onOpenChange(false);
            }}
          >
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
