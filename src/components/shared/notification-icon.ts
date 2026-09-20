import {
  Bell,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Kanban,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/types";

export function notificationTypeIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case "payment":
      return CreditCard;
    case "attendance":
      return ClipboardCheck;
    case "student":
      return GraduationCap;
    case "lead":
      return Kanban;
    case "exam":
      return BarChart3;
    default:
      return Bell;
  }
}
