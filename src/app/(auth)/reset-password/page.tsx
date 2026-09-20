"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";

const schema = z
  .object({ password: z.string().min(8), confirm: z.string().min(1) })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "mismatch" });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const [show, setShow] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 800));
    toast.success(t.settings.saved);
    router.push("/login");
  };

  const errors = form.formState.errors;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.auth.setNewPassword}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.auth.setNewPasswordSubtitle}</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t.auth.newPassword}</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              className="pr-10"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? t.a11y.hidePassword : t.a11y.showPassword}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{t.validation.passwordMin}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t.auth.confirmPassword}</Label>
          <Input id="confirm" type={show ? "text" : "password"} aria-invalid={!!errors.confirm} {...form.register("confirm")} />
          {errors.confirm && <p className="text-xs text-destructive">{t.auth.passwordsDontMatch}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {t.auth.updatePassword}
        </Button>
      </form>
    </div>
  );
}
