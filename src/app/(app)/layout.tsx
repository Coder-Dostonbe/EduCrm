"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { moduleLabel } from "@/components/layout/nav-config";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { canAccess, moduleForPath } from "@/lib/permissions";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { AccessDenied } from "@/components/shared/access-denied";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return <FullPageLoader />;

  // Hiding a link in the sidebar is presentation, not protection: the address
  // bar reaches every route regardless. This is the guard that actually keeps
  // a role out of a section it has no business in.
  const activeModule = moduleForPath(pathname);
  const allowed = activeModule === null || canAccess(role, activeModule);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {allowed ? (
            children
          ) : (
            <AccessDenied sectionLabel={activeModule ? moduleLabel(activeModule, dict) : undefined} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
