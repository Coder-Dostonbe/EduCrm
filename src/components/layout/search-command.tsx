"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Kanban,
  Users,
  UsersRound,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useT } from "@/lib/i18n";
import {
  courses,
  groups,
  leads,
  payments,
  studentById,
  students,
  teachers,
} from "@/data";
import { formatPhone, formatUZS, fullName } from "@/lib/format";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const t = useT();
  const router = useRouter();

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.common.search}
      description={t.search.hint}
      showCloseButton={false}
    >
      <CommandInput placeholder={t.search.placeholder} />
      <CommandList>
        <CommandEmpty>{t.common.noResults}</CommandEmpty>

        <CommandGroup heading={t.search.students}>
          {students.slice(0, 60).map((s) => (
            <CommandItem
              key={s.id}
              value={`${fullName(s)} ${s.phone}`}
              onSelect={() => go(`/students/${s.id}`)}
            >
              <GraduationCap className="size-4 text-muted-foreground" />
              <span>{fullName(s)}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatPhone(s.phone)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading={t.search.teachers}>
          {teachers.map((teacher) => (
            <CommandItem
              key={teacher.id}
              value={`${fullName(teacher)} ${teacher.specialization}`}
              onSelect={() => go(`/teachers/${teacher.id}`)}
            >
              <Users className="size-4 text-muted-foreground" />
              <span>{fullName(teacher)}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {teacher.specialization}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading={t.search.groups}>
          {groups.map((g) => (
            <CommandItem
              key={g.id}
              value={g.name}
              onSelect={() => go(`/groups/${g.id}`)}
            >
              <UsersRound className="size-4 text-muted-foreground" />
              <span>{g.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{g.room}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading={t.search.courses}>
          {courses.map((c) => (
            <CommandItem
              key={c.id}
              value={c.name}
              onSelect={() => go(`/courses/${c.id}`)}
            >
              <BookOpen className="size-4 text-muted-foreground" />
              <span>{c.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading={t.search.payments}>
          {payments.slice(0, 20).map((p) => {
            const s = studentById.get(p.studentId);
            return (
              <CommandItem
                key={p.id}
                value={`${p.invoiceNo} ${s ? fullName(s) : ""}`}
                onSelect={() => go("/payments")}
              >
                <CreditCard className="size-4 text-muted-foreground" />
                <span>{p.invoiceNo}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatUZS(p.amount)}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading={t.search.leads}>
          {leads.slice(0, 20).map((l) => (
            <CommandItem
              key={l.id}
              value={`${l.name} ${l.courseInterest}`}
              onSelect={() => go("/leads")}
            >
              <Kanban className="size-4 text-muted-foreground" />
              <span>{l.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {l.courseInterest}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
