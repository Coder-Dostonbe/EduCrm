"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { useAuth, demoAccounts } from "@/lib/auth";
import { GoogleSignInButton, GoogleIcon } from "@/components/auth/google-sign-in";
import { GOOGLE_CLIENT_ID, USE_REAL_API } from "@/services/config";

const schema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { dict: t, language } = useI18n();
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  /** Google only hands out real credentials when the API is behind us; in mock
   *  mode the button stays a one-click demo shortcut. */
  const googleLive = USE_REAL_API && !!GOOGLE_CLIENT_ID;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (values: FormValues) => {
    setAuthError(null);
    const res = await login(values.email, values.password);
    if (!res.ok) {
      setAuthError(t.auth.invalidCredentials);
      return;
    }
    router.push("/dashboard");
  };

  const onGoogle = async (idToken?: string) => {
    setAuthError(null);
    setGoogleLoading(true);
    const res = await loginWithGoogle(idToken);
    if (!res.ok) {
      // The API's own wording ("issued for a different application", "not
      // configured on the server") is what makes a misconfigured client ID
      // diagnosable, but it is English and technical — console, not UI.
      if (res.detail) console.error("[google sign-in]", res.detail);
      setAuthError(t.auth.googleFailed);
      setGoogleLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const onGoogleUnavailable = (reason: string) => {
    console.error("[google sign-in]", reason);
    setAuthError(t.auth.googleUnavailable);
    setGoogleLoading(false);
  };

  const { isSubmitting } = form.formState;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.auth.welcomeBack}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@eduflow.uz"
            aria-invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{t.validation.invalidEmail}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? t.a11y.hidePassword : t.a11y.showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{t.validation.required}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={form.watch("remember")}
            onCheckedChange={(v) => form.setValue("remember", v === true)}
          />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            {t.auth.rememberMe}
          </Label>
        </div>

        {authError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {authError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? t.auth.signingIn : t.auth.login}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase">{t.auth.orContinueWith}</span>
        <Separator className="flex-1" />
      </div>

      {googleLive ? (
        <GoogleSignInButton
          clientId={GOOGLE_CLIENT_ID}
          label={t.auth.continueWithGoogle}
          busy={googleLoading}
          locale={language}
          onCredential={onGoogle}
          onUnavailable={onGoogleUnavailable}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onGoogle()}
          disabled={googleLoading}
        >
          {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          {t.auth.continueWithGoogle}
        </Button>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t.auth.register}
        </Link>
      </p>

      {/* Demo accounts */}
      <div className="mt-8 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">{t.auth.demoHint}</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {demoAccounts.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                form.setValue("email", a.email);
                form.setValue("password", a.password);
                setAuthError(null);
              }}
              className="rounded-md border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="font-medium capitalize">{a.user.role}</span>
              <span className="block truncate text-muted-foreground">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
