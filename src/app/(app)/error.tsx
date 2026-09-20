"use client";

import * as React from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <ErrorState details={error.message} onRetry={reset} />
    </div>
  );
}
