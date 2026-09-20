"use client";

import * as React from "react";

/**
 * Simulates an async data fetch so skeleton/loading states are visible,
 * as they would be with a real backend.
 */
export function useMockLoading(delayMs = 600): {
  loading: boolean;
  reload: () => void;
} {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const id = setTimeout(() => setLoading(false), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  const reload = React.useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), delayMs);
  }, [delayMs]);

  return { loading, reload };
}
