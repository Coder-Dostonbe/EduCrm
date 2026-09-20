"use client";

import * as React from "react";
import { notifications as seedNotifications } from "@/data";
import type { AppNotification, NotificationType } from "@/types";

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  filter: NotificationType | "all";
  setFilter: (f: NotificationType | "all") => void;
}

const NotificationsContext = React.createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<AppNotification[]>(seedNotifications);
  const [filter, setFilter] = React.useState<NotificationType | "all">("all");

  const markRead = React.useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = React.useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = React.useMemo<NotificationsContextValue>(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      markRead,
      markAllRead,
      filter,
      setFilter,
    }),
    [items, markRead, markAllRead, filter]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = React.useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
