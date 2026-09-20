"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { groups, groupById, rooms } from "@/data";
import type { ScheduleEvent } from "@/types";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create */
  event: ScheduleEvent | null;
  defaultDate?: string;
  onSave: (data: {
    id?: string;
    groupId: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => void;
  onDelete?: (id: string) => void;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSave,
  onDelete,
}: EventDialogProps) {
  const t = useT();
  const [groupId, setGroupId] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("14:00");
  const [endTime, setEndTime] = React.useState("15:30");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Reset the form whenever the dialog is opened (state adjusted during render,
  // the pattern React recommends over an effect for prop-driven resets).
  const [lastOpened, setLastOpened] = React.useState<string | null>(null);
  const openKey = open ? (event?.id ?? `new:${defaultDate ?? ""}`) : null;
  if (openKey !== lastOpened) {
    setLastOpened(openKey);
    if (open) {
      if (event) {
        setGroupId(event.groupId);
        setRoom(event.room);
        setDate(event.date);
        setStartTime(event.startTime);
        setEndTime(event.endTime);
      } else {
        setGroupId("");
        setRoom("");
        setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
        setStartTime("14:00");
        setEndTime("15:30");
      }
    }
  }

  const valid = groupId && room && date && startTime && endTime && startTime < endTime;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{event ? t.schedule.editEvent : t.schedule.newEvent}</DialogTitle>
            <DialogDescription>{t.schedule.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.group}</Label>
              <Select
                value={groupId}
                onValueChange={(v) => {
                  setGroupId(v);
                  const g = groupById.get(v);
                  if (g && !event) {
                    setRoom(g.room);
                    setStartTime(g.schedule.startTime);
                    setEndTime(g.schedule.endTime);
                  }
                }}
              >
                <SelectTrigger className="w-full" aria-label={t.common.group}>
                  <SelectValue placeholder={t.attendance.selectGroup} />
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.common.room}</Label>
                <Select value={room} onValueChange={setRoom}>
                  <SelectTrigger className="w-full" aria-label={t.common.room}>
                    <SelectValue placeholder={t.common.room} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">{t.common.date}</Label>
                <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">{t.schedule.startTime}</Label>
                <Input
                  id="ev-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">{t.schedule.endTime}</Label>
                <Input
                  id="ev-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {event && onDelete ? (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                {t.common.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </Button>
              <Button
                disabled={!valid}
                onClick={() => {
                  const g = groupById.get(groupId);
                  if (!g) return;
                  onSave({ id: event?.id, groupId, room, date, startTime, endTime });
                  onOpenChange(false);
                }}
              >
                {t.common.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.schedule.deleteEvent}</AlertDialogTitle>
            <AlertDialogDescription>{t.schedule.deleteEventConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (event && onDelete) onDelete(event.id);
                setConfirmDelete(false);
                onOpenChange(false);
              }}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
