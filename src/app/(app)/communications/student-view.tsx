"use client";

import * as React from "react";
import { Mail, Phone, Send, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n";
import { courseById, groupById, teacherById } from "@/data";
import { formatPhone, fullName, initials } from "@/lib/format";
import type { Student, Teacher } from "@/types";

/** What a student gets instead of the campaign console: the people teaching
 *  them, and the two ways they actually reach a teacher here — phone and
 *  Telegram. */
export function StudentContacts({ student }: { student: Student }) {
  const t = useT();

  const group = groupById.get(student.groupId);
  const course = courseById.get(student.courseId);

  const groupTeacher = group ? teacherById.get(group.teacherId) : undefined;
  const courseTeachers = (course?.teacherIds ?? [])
    .map((id) => teacherById.get(id))
    .filter((x): x is Teacher => !!x && x.id !== groupTeacher?.id);

  const hasAny = !!groupTeacher || courseTeachers.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t.nav.myTeachers}
        description={t.communications.myTeachersSubtitle}
      />

      {!hasAny ? (
        <EmptyState
          icon={UsersRound}
          title={t.communications.noTeachers}
          description={t.communications.noTeachersHint}
        />
      ) : (
        <div className="space-y-6">
          {groupTeacher ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t.communications.myTeacher}
                {group ? <span className="ml-1.5 font-normal">· {group.name}</span> : null}
              </h2>
              <TeacherCard teacher={groupTeacher} primary />
            </section>
          ) : null}

          {courseTeachers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t.communications.courseTeachers}
                {course ? <span className="ml-1.5 font-normal">· {course.name}</span> : null}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {courseTeachers.map((teacher) => (
                  <TeacherCard key={teacher.id} teacher={teacher} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TeacherCard({ teacher, primary = false }: { teacher: Teacher; primary?: boolean }) {
  const t = useT();

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar className="size-12 border">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {initials(fullName(teacher))}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{fullName(teacher)}</p>
            {primary ? (
              <Badge variant="secondary" className="font-normal">
                {t.communications.myTeacher}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">{teacher.specialization}</p>
        </div>
      </div>

      <dl className="space-y-1.5 border-t pt-3 text-sm">
        <ContactRow icon={Phone} label={t.common.phone}>
          <a href={`tel:${teacher.phone}`} className="font-medium tabular-nums hover:underline">
            {formatPhone(teacher.phone)}
          </a>
        </ContactRow>
        <ContactRow icon={Send} label="Telegram">
          <a
            href={`https://t.me/${teacher.telegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            @{teacher.telegram}
          </a>
        </ContactRow>
        <ContactRow icon={Mail} label={t.common.email}>
          <a href={`mailto:${teacher.email}`} className="font-medium hover:underline">
            {teacher.email}
          </a>
        </ContactRow>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`tel:${teacher.phone}`}>
            <Phone className="size-4" />
            {t.communications.call}
          </a>
        </Button>
        <Button asChild size="sm">
          <a
            href={`https://t.me/${teacher.telegram}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send className="size-4" />
            {t.communications.writeTelegram}
          </a>
        </Button>
      </div>
    </Card>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}
