"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { BranchProvider } from "@/lib/branch";
import { NotificationsProvider } from "@/lib/notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <I18nProvider>
        <AuthProvider>
          <BranchProvider>
            <NotificationsProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <Toaster position="bottom-right" richColors closeButton />
            </NotificationsProvider>
          </BranchProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
