"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const t = useT();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight">404</p>
        <p className="mt-1 text-base font-medium">{t.notFound.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.notFound.description}</p>
      </div>
      <Button asChild size="sm">
        <Link href="/dashboard">
          <ArrowLeft className="size-4" />
          {t.notFound.backToDashboard}
        </Link>
      </Button>
    </div>
  );
}
