"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/** Shown in place of a page the signed-in role may not open.
 *
 *  Rendered inside the app shell rather than redirected away, so the person
 *  can see why they landed here and reach somewhere they are allowed.
 */
export function AccessDenied({ sectionLabel }: { sectionLabel?: string }) {
  const t = useT();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-5 text-destructive" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">{t.access.title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{t.access.description}</p>
      {sectionLabel ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t.access.section}: <span className="font-medium text-foreground">{sectionLabel}</span>
        </p>
      ) : null}
      <Button asChild size="sm" className="mt-5">
        <Link href="/dashboard">{t.access.backToDashboard}</Link>
      </Button>
    </div>
  );
}
