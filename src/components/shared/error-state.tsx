"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, description, details, onRetry, className }: ErrorStateProps) {
  const t = useT();
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-destructive/30 bg-destructive/2 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title ?? t.common.somethingWentWrong}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description ?? t.common.errorHint}
      </p>
      <div className="mt-4 flex items-center gap-2">
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw className="size-3.5" />
            {t.common.retry}
          </Button>
        ) : null}
        {details ? (
          <Button size="sm" variant="ghost" onClick={() => setShowDetails((s) => !s)}>
            {t.common.seeDetails}
          </Button>
        ) : null}
      </div>
      {showDetails && details ? (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-muted-foreground">
          {details}
        </pre>
      ) : null}
    </div>
  );
}
