"use client";

import * as React from "react";
import { branches } from "@/data";
import type { Branch } from "@/types";

const STORAGE_KEY = "eduflow.branch";

interface BranchContextValue {
  /** "all" or a branch id */
  branchId: string;
  setBranchId: (id: string) => void;
  branch: Branch | null;
  branches: Branch[];
}

const BranchContext = React.createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branchId, setBranchIdState] = React.useState<string>("all");

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "all" || branches.some((b) => b.id === stored))) {
        // Reading browser storage is only possible after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBranchIdState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setBranchId = React.useCallback((id: string) => {
    setBranchIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo<BranchContextValue>(
    () => ({
      branchId,
      setBranchId,
      branch: branches.find((b) => b.id === branchId) ?? null,
      branches,
    }),
    [branchId, setBranchId]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const ctx = React.useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
