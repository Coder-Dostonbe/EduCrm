"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export default function VerifyEmailPage() {
  const t = useT();
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
        <MailOpen className="size-5 text-primary" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{t.auth.verifyEmailTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.auth.verifyEmailSubtitle}</p>

      <Button
        variant="outline"
        className="mt-6 w-full"
        disabled={cooldown > 0}
        onClick={() => {
          setCooldown(30);
          toast.success(t.auth.resetSent);
        }}
      >
        {t.auth.resendEmail}
        {cooldown > 0 ? ` (${cooldown})` : ""}
      </Button>

      <Button asChild variant="ghost" className="mt-3 w-full">
        <Link href="/login">
          <ArrowLeft className="size-4" />
          {t.auth.backToLogin}
        </Link>
      </Button>
    </div>
  );
}
