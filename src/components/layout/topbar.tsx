"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Check,
  ChevronsUpDown,
  CircleHelp,
  Globe,
  LogOut,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n, useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useAvatar } from "@/lib/avatar";
import { useBranch } from "@/lib/branch";
import { useNotifications } from "@/lib/notifications";
import { languageNames } from "@/translations";
import type { Language } from "@/types";
import { initials, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SearchCommand } from "./search-command";
import { notificationTypeIcon } from "@/components/shared/notification-icon";

export function Topbar() {
  const t = useT();
  const { language, setLanguage } = useI18n();
  const { user, role, logout } = useAuth();
  const avatar = useAvatar();
  const { branchId, setBranchId, branches } = useBranch();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isAdminOrManager = role === "admin" || role === "manager";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden !h-5 sm:block" />

      {/* Global search */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:max-w-sm"
        aria-label={t.search.placeholder}
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden truncate sm:inline">{t.search.placeholder}</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-block">
          Ctrl K
        </kbd>
      </button>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="ml-auto flex items-center gap-1">
        {/* Branch selector */}
        {isAdminOrManager ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden gap-1.5 sm:flex">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="max-w-28 truncate">
                  {branchId === "all"
                    ? t.common.allBranches
                    : branches.find((b) => b.id === branchId)?.name}
                </span>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{t.common.selectBranch}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setBranchId("all")}>
                {t.common.allBranches}
                {branchId === "all" && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {branches.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => setBranchId(b.id)}>
                  {b.name}
                  {branchId === b.id && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Globe className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase">{language}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <DropdownMenuItem key={lang} onClick={() => setLanguage(lang)}>
                {languageNames[lang]}
                {language === lang && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={t.common.notifications}>
              <Bell className="size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(22.5rem,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <p className="text-sm font-semibold">{t.notifications.title}</p>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  {t.notifications.markAllRead}
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.slice(0, 6).map((n) => {
                const Icon = notificationTypeIcon(n.type);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markRead(n.id);
                      if (n.link) router.push(n.link);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                      !n.read && "bg-primary/4"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                        n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm", !n.read && "font-medium")}>{n.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">{formatDate(n.date)}</p>
                    </div>
                    {!n.read && <span className="mt-2 ml-auto size-1.5 shrink-0 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t p-1.5">
              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <Link href="/notifications">{t.common.viewAll}</Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Help */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:flex" aria-label={t.common.help}>
              <CircleHelp className="size-4.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.common.help}</TooltipContent>
        </Tooltip>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pr-1.5 pl-1.5">
              <Avatar className="size-7">
                {avatar ? <AvatarImage src={avatar} alt="" /> : null}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {user ? initials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight lg:grid">
                <span className="max-w-32 truncate text-[13px] font-medium">{user?.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {role ? t.roles[role] : ""}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound className="size-4" />
                {t.common.profile}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="size-4" />
                {t.common.settings}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut className="size-4" />
              {t.common.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {unreadCount > 0 ? <Badge className="sr-only">{unreadCount}</Badge> : null}
    </header>
  );
}
