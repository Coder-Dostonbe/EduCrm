"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { notificationTypeIcon } from "@/components/shared/notification-icon";
import { useT } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { formatDate } from "@/lib/format";
import type { NotificationType } from "@/types";
import { cn } from "@/lib/utils";

const TYPES: (NotificationType | "all")[] = [
  "all",
  "payment",
  "attendance",
  "student",
  "lead",
  "exam",
  "system",
];

export default function NotificationsPage() {
  const t = useT();
  const { items, unreadCount, markRead, markAllRead, filter, setFilter } = useNotifications();

  const filtered = items.filter((n) => filter === "all" || n.type === filter);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t.notifications.title}
        description={t.notifications.subtitle}
        actions={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              <CheckCheck className="size-4" />
              {t.notifications.markAllRead}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((type) => {
          const active = filter === type;
          const count =
            type === "all" ? items.length : items.filter((n) => n.type === type).length;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/8 text-primary"
                  : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              {type === "all" ? t.common.all : t.notifications.types[type]}
              <span className="tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
        {unreadCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {t.notifications.unread}: <span className="font-semibold">{unreadCount}</span>
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t.notifications.empty}
          description={t.notifications.emptyHint}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n, i) => {
            const Icon = notificationTypeIcon(n.type);
            const inner = (
              <Card
                className={cn(
                  "flex-row items-start gap-3 p-4 transition-all hover:shadow-sm",
                  !n.read && "border-primary/25 bg-primary/3"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {t.notifications.types[n.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70 tabular-nums">
                    {formatDate(n.date, "dd MMM yyyy")}
                  </p>
                </div>
                {!n.read && !n.link && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => markRead(n.id)}
                  >
                    {t.notifications.markRead}
                  </Button>
                )}
                {!n.read && n.link && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </Card>
            );
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                {n.link ? (
                  <Link href={n.link} onClick={() => markRead(n.id)}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
