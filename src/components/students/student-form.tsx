"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n";
import { courses, groups } from "@/data";
import type { Student } from "@/types";

const phoneRegex = /^\+998\d{9}$/;

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().regex(phoneRegex),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().min(1),
  gender: z.enum(["male", "female"]),
  address: z.string().min(3),
  parentName: z.string().min(3),
  parentPhone: z.string().regex(phoneRegex),
  courseId: z.string().min(1),
  groupId: z.string().min(1),
  enrollmentDate: z.string().min(1),
  monthlyFee: z.number().positive(),
  notes: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof schema>;

interface StudentFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** present = edit mode */
  student?: Student | null;
  onSubmit: (values: StudentFormValues) => void;
}

export function StudentFormSheet({ open, onOpenChange, student, onSubmit }: StudentFormSheetProps) {
  const t = useT();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "+998",
      email: "",
      dateOfBirth: "",
      gender: "male",
      address: "",
      parentName: "",
      parentPhone: "+998",
      courseId: "",
      groupId: "",
      enrollmentDate: new Date().toISOString().slice(0, 10),
      monthlyFee: 450000,
      notes: "",
    },
  });

  // Load values when the sheet opens (render-phase adjustment, not an effect).
  const [lastOpened, setLastOpened] = React.useState<string | null>(null);
  const openKey = open ? (student?.id ?? "new") : null;
  if (openKey !== lastOpened) {
    setLastOpened(openKey);
    if (open && student) {
      form.reset({
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        email: student.email ?? "",
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        address: student.address,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        courseId: student.courseId,
        groupId: student.groupId,
        enrollmentDate: student.enrollmentDate,
        monthlyFee: student.monthlyFee,
        notes: student.notes ?? "",
      });
    } else if (open) {
      form.reset();
    }
  }

  const courseId = form.watch("courseId");
  const courseGroups = groups.filter((g) => g.courseId === courseId);
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    await new Promise((r) => setTimeout(r, 500));
    onSubmit(values);
    onOpenChange(false);
  });

  const field = (id: keyof StudentFormValues, label: string, node: React.ReactNode, error?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {node}
      {errors[id] && <p className="text-xs text-destructive">{error ?? t.validation.required}</p>}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{student ? t.students.form.editTitle : t.students.form.title}</SheetTitle>
          <SheetDescription>{t.students.subtitle}</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex-1 space-y-5 px-4 pb-4" noValidate>
          <div>
            <p className="mb-3 text-[13px] font-semibold text-muted-foreground uppercase">
              {t.students.form.personal}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("firstName", t.students.form.firstName,
                <Input id="firstName" aria-invalid={!!errors.firstName} {...form.register("firstName")} />)}
              {field("lastName", t.students.form.lastName,
                <Input id="lastName" aria-invalid={!!errors.lastName} {...form.register("lastName")} />)}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {field("phone", t.common.phone,
                <Input id="phone" placeholder="+998901234567" aria-invalid={!!errors.phone} {...form.register("phone")} />,
                t.validation.invalidPhone)}
              {field("email", `${t.common.email} (${t.common.optional})`,
                <Input id="email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />,
                t.validation.invalidEmail)}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {field("dateOfBirth", t.students.form.dateOfBirth,
                <Input id="dateOfBirth" type="date" aria-invalid={!!errors.dateOfBirth} {...form.register("dateOfBirth")} />)}
              <div className="space-y-1.5">
                <Label>{t.students.form.gender}</Label>
                <RadioGroup
                  className="flex h-9 items-center gap-4"
                  value={form.watch("gender")}
                  onValueChange={(v) => form.setValue("gender", v as "male" | "female")}
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male" className="text-sm font-normal">
                      {t.students.form.male}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female" className="text-sm font-normal">
                      {t.students.form.female}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="mt-3">
              {field("address", t.students.form.address,
                <Input id="address" aria-invalid={!!errors.address} {...form.register("address")} />)}
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-[13px] font-semibold text-muted-foreground uppercase">
              {t.students.form.parent}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("parentName", t.students.form.parentName,
                <Input id="parentName" aria-invalid={!!errors.parentName} {...form.register("parentName")} />)}
              {field("parentPhone", t.students.form.parentPhone,
                <Input id="parentPhone" placeholder="+998901234567" aria-invalid={!!errors.parentPhone} {...form.register("parentPhone")} />,
                t.validation.invalidPhone)}
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-[13px] font-semibold text-muted-foreground uppercase">
              {t.students.form.education}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.students.form.course}</Label>
                <Select
                  value={courseId}
                  onValueChange={(v) => {
                    form.setValue("courseId", v, { shouldValidate: true });
                    form.setValue("groupId", "");
                    const c = courses.find((x) => x.id === v);
                    if (c) form.setValue("monthlyFee", c.price);
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.courseId} aria-label={t.students.form.course}>
                    <SelectValue placeholder={t.students.form.course} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courseId && <p className="text-xs text-destructive">{t.validation.required}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.students.form.group}</Label>
                <Select
                  value={form.watch("groupId")}
                  onValueChange={(v) => form.setValue("groupId", v, { shouldValidate: true })}
                  disabled={!courseId}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.groupId} aria-label={t.students.form.group}>
                    <SelectValue placeholder={t.students.form.group} />
                  </SelectTrigger>
                  <SelectContent>
                    {courseGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.groupId && <p className="text-xs text-destructive">{t.validation.required}</p>}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {field("enrollmentDate", t.students.form.enrollmentDate,
                <Input id="enrollmentDate" type="date" aria-invalid={!!errors.enrollmentDate} {...form.register("enrollmentDate")} />)}
              {field("monthlyFee", `${t.students.form.monthlyFee} (UZS)`,
                <Input id="monthlyFee" type="number" step={10000} aria-invalid={!!errors.monthlyFee} {...form.register("monthlyFee", { valueAsNumber: true })} />,
                t.validation.positiveNumber)}
            </div>
            <div className="mt-3">
              {field("notes", `${t.students.form.notes} (${t.common.optional})`,
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder={t.students.form.notesPlaceholder}
                  {...form.register("notes")}
                />)}
            </div>
          </div>
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden />
        </form>

        <SheetFooter className="border-t">
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button className="flex-1" onClick={submit} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {student ? t.common.update : t.common.create}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
