"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { uz as uzLocale, ru as ruLocale, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { EventDialog } from "@/components/calendar/event-dialog";
import { useT, useI18n } from "@/lib/i18n";
import { useBranch } from "@/lib/branch";
import { useAuth } from "@/lib/auth";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  courseById,
  groupById,
  rooms,
  scheduleEvents as seedEvents,
  teacherById,
  teachers,
  groups,
} from "@/data";
import { fullName } from "@/lib/format";
import type { ScheduleEvent } from "@/types";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_PX = 56;

function timeToY(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR + m / 60) * HOUR_PX;
}

// ── Draggable event chip ─────────────────────────────────────────────

function EventChip({
  event,
  onClick,
  style,
  compact = false,
}: {
  event: ScheduleEvent;
  onClick: () => void;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
  });
  const course = courseById.get(event.courseId);
  const group = groupById.get(event.groupId);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        borderLeftColor: `var(--${course?.color ?? "chart-1"})`,
        background: `color-mix(in oklab, var(--${course?.color ?? "chart-1"}) 9%, var(--card))`,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }}
      className={cn(
        "block w-full cursor-grab rounded-md border border-l-3 px-1.5 text-left shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing",
        compact ? "py-0.5" : "py-1"
      )}
    >
      <p className={cn("truncate font-medium", compact ? "text-[10px]" : "text-[11px]")}>
        {group?.name}
      </p>
      {!compact && (
        <p className="truncate text-[10px] text-muted-foreground">
          {event.startTime}–{event.endTime} · {event.room}
        </p>
      )}
    </button>
  );
}

// ── Droppable day cell/column ────────────────────────────────────────

function DroppableDay({
  date,
  children,
  className,
}: {
  date: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "bg-primary/4")}>
      {children}
    </div>
  );
}

export default function SchedulePage() {
  const t = useT();
  const { language } = useI18n();
  const { branchId } = useBranch();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(450);
  const locale = language === "ru" ? ruLocale : language === "en" ? enUS : uzLocale;

  const [events, setEvents] = React.useState<ScheduleEvent[]>(seedEvents);
  const [view, setView] = React.useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = React.useState(new Date());
  const [teacherFilter, setTeacherFilter] = React.useState("all");
  const [roomFilter, setRoomFilter] = React.useState("all");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<ScheduleEvent | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = React.useMemo(
    () =>
      events.filter((e) => {
        if (role === "teacher" && e.teacherId !== user?.id) return false;
        if (branchId !== "all" && e.branchId !== branchId) return false;
        if (teacherFilter !== "all" && e.teacherId !== teacherFilter) return false;
        if (roomFilter !== "all" && e.room !== roomFilter) return false;
        if (groupFilter !== "all" && e.groupId !== groupFilter) return false;
        return true;
      }),
    [events, role, user, branchId, teacherFilter, roomFilter, groupFilter]
  );

  const eventsOn = React.useCallback(
    (d: Date) => filtered.filter((e) => e.date === iso(d)).sort((a, b) => (a.startTime < b.startTime ? -1 : 1)),
    [filtered]
  );

  const navigate = (dir: -1 | 1) => {
    if (view === "day") setAnchor((d) => addDays(d, dir));
    else if (view === "week") setAnchor((d) => (dir === 1 ? addDays(d, 7) : subDays(d, 7)));
    else setAnchor((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const eventId = String(e.active.id);
    const targetDate = e.over ? String(e.over.id) : null;
    if (!targetDate) return;
    const ev = events.find((x) => x.id === eventId);
    if (!ev || ev.date === targetDate) return;
    setEvents((prev) => prev.map((x) => (x.id === eventId ? { ...x, date: targetDate } : x)));
    toast.success(t.schedule.eventUpdated);
  };

  const saveEvent = (data: {
    id?: string;
    groupId: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => {
    const g = groupById.get(data.groupId);
    if (!g) return;
    if (data.id) {
      setEvents((prev) =>
        prev.map((x) =>
          x.id === data.id
            ? { ...x, ...data, id: x.id, courseId: g.courseId, teacherId: g.teacherId, branchId: g.branchId }
            : x
        )
      );
      toast.success(t.schedule.eventUpdated);
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id: `ev-new-${Date.now()}`,
          groupId: data.groupId,
          courseId: g.courseId,
          teacherId: g.teacherId,
          room: data.room,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          branchId: g.branchId,
        },
      ]);
      toast.success(t.schedule.eventCreated);
    }
  };

  const openEvent = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    setDialogOpen(true);
  };

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(anchor, { weekStartsOn: 1 }) });
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const monthStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const headerLabel =
    view === "month"
      ? format(anchor, "LLLL yyyy", { locale })
      : view === "week"
        ? `${format(weekStart, "d MMM", { locale })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale })}`
        : format(anchor, "EEEE, d MMMM yyyy", { locale });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t.schedule.title}
        description={t.schedule.subtitle}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingEvent(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t.schedule.newEvent}
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => navigate(-1)} aria-label={t.a11y.previous}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setAnchor(new Date())}>
            {t.common.today}
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => navigate(1)} aria-label={t.a11y.next}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="min-w-40 text-sm font-semibold capitalize">{headerLabel}</p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.schedule[v]}
              </button>
            ))}
          </div>

          {role !== "teacher" && (
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}: {t.schedule.filters.teacher}</SelectItem>
                {teachers.map((x) => (
                  <SelectItem key={x.id} value={x.id}>{fullName(x)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={roomFilter} onValueChange={setRoomFilter}>
            <SelectTrigger size="sm" className="w-auto min-w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}: {t.schedule.filters.roomF}</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger size="sm" className="w-auto min-w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}: {t.schedule.filters.groupF}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <ChartSkeleton height={480} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          {/* WEEK VIEW */}
          {view === "week" && (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <div className="min-w-3xl">
                {/* Day headers */}
                <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
                  <div />
                  {weekDays.map((d) => (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "border-l px-2 py-2 text-center",
                        isToday(d) && "bg-primary/4"
                      )}
                    >
                      <p className="text-[11px] text-muted-foreground uppercase">
                        {format(d, "EEE", { locale })}
                      </p>
                      <p
                        className={cn(
                          "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                          isToday(d) && "bg-primary text-primary-foreground"
                        )}
                      >
                        {format(d, "d")}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Time grid */}
                <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                  {/* Hour labels */}
                  <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }}>
                    {hours.slice(0, -1).map((h) => (
                      <span
                        key={h}
                        className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
                        style={{ top: (h - START_HOUR) * HOUR_PX + 1 }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {weekDays.map((d) => {
                    const dayEvents = eventsOn(d);
                    return (
                      <DroppableDay
                        key={d.toISOString()}
                        date={iso(d)}
                        className={cn("relative border-l", isToday(d) && "bg-primary/2")}
                      >
                        <div style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }} className="relative">
                          {/* hour lines */}
                          {hours.slice(1, -1).map((h) => (
                            <div
                              key={h}
                              className="absolute right-0 left-0 border-t border-dashed border-border/60"
                              style={{ top: (h - START_HOUR) * HOUR_PX }}
                            />
                          ))}
                          {dayEvents.map((e) => {
                            const top = timeToY(e.startTime);
                            const height = Math.max(28, timeToY(e.endTime) - top - 2);
                            return (
                              <EventChip
                                key={e.id}
                                event={e}
                                onClick={() => openEvent(e)}
                                style={{
                                  position: "absolute",
                                  top,
                                  height,
                                  left: 2,
                                  right: 2,
                                  width: "auto",
                                  overflow: "hidden",
                                }}
                              />
                            );
                          })}
                        </div>
                      </DroppableDay>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {view === "day" && (
            <div className="rounded-lg border bg-card p-4">
              {eventsOn(anchor).length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title={t.schedule.noClasses}
                  description={t.schedule.noClassesHint}
                  className="border-0"
                />
              ) : (
                <div className="space-y-2">
                  {eventsOn(anchor).map((e) => {
                    const g = groupById.get(e.groupId);
                    const c = courseById.get(e.courseId);
                    const teacher = teacherById.get(e.teacherId);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => openEvent(e)}
                        className="flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                      >
                        <div className="w-20 shrink-0 text-center">
                          <p className="text-sm font-semibold tabular-nums">{e.startTime}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{e.endTime}</p>
                        </div>
                        <span
                          className="h-10 w-1 shrink-0 rounded-full"
                          style={{ background: `var(--${c?.color ?? "chart-1"})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{g?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c?.name} · {teacher ? fullName(teacher) : ""}
                          </p>
                        </div>
                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                          {t.common.room} {e.room}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MONTH VIEW */}
          {view === "month" && (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <div className="grid min-w-2xl grid-cols-7 border-b bg-muted/40">
                {weekDays.map((d) => (
                  <div key={d.toISOString()} className="px-2 py-2 text-center text-[11px] font-medium text-muted-foreground uppercase">
                    {format(d, "EEE", { locale })}
                  </div>
                ))}
              </div>
              <div className="grid min-w-2xl grid-cols-7">
                {monthDays.map((d) => {
                  const dayEvents = eventsOn(d);
                  const inMonth = isSameMonth(d, anchor);
                  return (
                    <DroppableDay
                      key={d.toISOString()}
                      date={iso(d)}
                      className={cn(
                        "min-h-24 border-r border-b p-1.5 last:border-r-0",
                        !inMonth && "bg-muted/25"
                      )}
                    >
                      <p
                        className={cn(
                          "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday(d) && "bg-primary text-primary-foreground",
                          !inMonth && "text-muted-foreground/60"
                        )}
                      >
                        {format(d, "d")}
                      </p>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <EventChip key={e.id} event={e} compact onClick={() => openEvent(e)} />
                        ))}
                        {dayEvents.length > 3 && (
                          <button
                            type="button"
                            className="w-full rounded px-1 text-left text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setAnchor(d);
                              setView("day");
                            }}
                          >
                            +{dayEvents.length - 3} {t.schedule.lessons}
                          </button>
                        )}
                      </div>
                    </DroppableDay>
                  );
                })}
              </div>
            </div>
          )}
        </DndContext>
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingEvent(null);
        }}
        event={editingEvent}
        defaultDate={iso(anchor)}
        onSave={saveEvent}
        onDelete={(id) => {
          setEvents((prev) => prev.filter((x) => x.id !== id));
          toast.success(t.schedule.eventDeleted);
        }}
      />
    </div>
  );
}
