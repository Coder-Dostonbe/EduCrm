"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useT();
  const [sent, setSent] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
          <MailCheck className="size-5 text-success" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{t.auth.resetTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.auth.resetSent}</p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/login">
            <ArrowLeft className="size-4" />
            {t.auth.backToLogin}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.auth.resetTitle}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.auth.resetSubtitle}</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.common.email}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            aria-invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{t.validation.invalidEmail}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {t.auth.sendResetLink}
        </Button>
      </form>

      <Button asChild variant="ghost" className="mt-4 w-full">
        <Link href="/login">
          <ArrowLeft className="size-4" />
          {t.auth.backToLogin}
        </Link>
      </Button>
    </div>
  );
}
