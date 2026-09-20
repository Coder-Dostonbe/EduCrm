"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Plus, Search, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { courses, teacherById } from "@/data";
import { formatUZS, fullName } from "@/lib/format";
import type { CourseCategory } from "@/types";

export default function CoursesPage() {
  const t = useT();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(500);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");

  // A student sees the catalogue narrowed to the one course they attend, so
  // the search and category controls have nothing left to do.
  const isStudent = role === "student";
  const enrolled = isStudent ? studentForUser(user) : null;

  const visible = isStudent
    ? courses.filter((c) => c.id === enrolled?.courseId)
    : courses;

  const filtered = isStudent
    ? visible
    : visible.filter((c) => {
        if (category !== "all" && c.category !== category) return false;
        if (query && !c.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
        return true;
      });

  const categories: CourseCategory[] = ["languages", "it", "math", "design", "exam-prep"];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={isStudent ? t.nav.myCourses : t.courses.title}
        description={isStudent ? t.courses.mySubtitle : t.courses.subtitle}
        actions={
          isStudent ? undefined : (
            <Button size="sm" onClick={() => toast.info(t.common.comingSoon)}>
              <Plus className="size-4" />
              {t.courses.addCourse}
            </Button>
          )
        }
      />

      {!isStudent && (
      <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-60">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              aria-label={t.common.search}
              className="h-8 pl-8"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-auto min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}: {t.courses.category}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{t.courses.categories[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            isStudent
              ? t.courses.notEnrolled
              : query || category !== "all"
                ? t.common.noResults
                : t.courses.empty
          }
          description={
            isStudent
              ? t.courses.notEnrolledHint
              : query || category !== "all"
                ? undefined
                : t.courses.emptyHint
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => {
            const mainTeacher = c.teacherIds[0] ? teacherById.get(c.teacherIds[0]) : undefined;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link href={`/courses/${c.id}`}>
                  <Card className="group h-full gap-3 p-5 transition-all hover:border-primary/30 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex size-10 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ background: `var(--${c.color})` }}
                      >
                        <BookOpen className="size-5" />
                      </div>
                      <Badge variant="secondary" className="font-normal">
                        {t.courses.categories[c.category]}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-primary">{c.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {c.description}
                      </p>
                    </div>
                    <div className="mt-auto space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" /> {c.studentCount} {t.common.students}
                        </span>
                        <span className="flex items-center gap-1">
                          <UsersRound className="size-3.5" /> {c.groupCount} {t.nav.groups.toLowerCase()}
                        </span>
                        <span>{c.durationMonths} {t.common.months}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary tabular-nums">
                          {formatUZS(c.price)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {t.common.perMonth}
                          </span>
                        </span>
                        {mainTeacher && (
                          <span className="truncate text-xs text-muted-foreground">
                            {fullName(mainTeacher)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
