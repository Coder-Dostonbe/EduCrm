"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { navForRole } from "./nav-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const t = useT();
  const { role, user } = useAuth();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const sections = React.useMemo(() => navForRole(role), [role]);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-1.5 group-data-[collapsible=icon]:justify-center"
          onClick={() => setOpenMobile(false)}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-4.5" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-semibold tracking-tight">EduFlow</span>
            <span className="text-[11px] text-muted-foreground">Education CRM</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {sections.map((section) => (
          <SidebarGroup key={section.key}>
            {section.labelKey ? (
              <SidebarGroupLabel className="text-[11px] font-medium tracking-wide uppercase">
                {section.labelKey(t)}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.labelKey(t)}
                        className={cn(
                          "transition-colors",
                          active &&
                            "bg-primary/8 text-primary font-medium hover:bg-primary/12 hover:text-primary"
                        )}
                      >
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <item.icon className={cn(active && "text-primary")} />
                          <span>{item.labelKey(t)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <div className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-sidebar-foreground">{user?.name}</p>
          <p>{role ? t.roles[role] : ""}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
