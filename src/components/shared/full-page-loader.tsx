"use client";

import { GraduationCap } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-12 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
        <GraduationCap className="size-6" />
      </div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-[loader-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}
