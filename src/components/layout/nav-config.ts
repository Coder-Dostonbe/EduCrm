import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Contact,
  CreditCard,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";
import type { Dict } from "@/translations";
import { canAccess, type ModuleKey } from "@/lib/permissions";

export interface NavItem {
  key: string;
  labelKey: (d: Dict) => string;
  href: string;
  icon: LucideIcon;
  module: ModuleKey;
}

export interface NavSection {
  key: string;
  labelKey: ((d: Dict) => string) | null;
  items: NavItem[];
}

const allSections: NavSection[] = [
  {
    key: "main",
    labelKey: null,
    items: [
      { key: "dashboard", labelKey: (d) => d.nav.dashboard, href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    key: "education",
    labelKey: (d) => d.nav.education,
    items: [
      { key: "students", labelKey: (d) => d.nav.students, href: "/students", icon: GraduationCap, module: "students" },
      { key: "teachers", labelKey: (d) => d.nav.teachers, href: "/teachers", icon: Users, module: "teachers" },
      { key: "courses", labelKey: (d) => d.nav.courses, href: "/courses", icon: BookOpen, module: "courses" },
      { key: "groups", labelKey: (d) => d.nav.groups, href: "/groups", icon: UsersRound, module: "groups" },
      { key: "schedule", labelKey: (d) => d.nav.schedule, href: "/schedule", icon: CalendarDays, module: "schedule" },
      { key: "attendance", labelKey: (d) => d.nav.attendance, href: "/attendance", icon: ClipboardCheck, module: "attendance" },
      { key: "exams", labelKey: (d) => d.nav.exams, href: "/exams", icon: BarChart3, module: "exams" },
    ],
  },
  {
    key: "crm",
    labelKey: (d) => d.nav.crm,
    items: [
      { key: "leads", labelKey: (d) => d.nav.leads, href: "/leads", icon: Kanban, module: "leads" },
      { key: "communications", labelKey: (d) => d.nav.communications, href: "/communications", icon: MessagesSquare, module: "communications" },
    ],
  },
  {
    key: "finance",
    labelKey: (d) => d.nav.finance,
    items: [
      { key: "payments", labelKey: (d) => d.nav.payments, href: "/payments", icon: CreditCard, module: "payments" },
      { key: "debts", labelKey: (d) => d.nav.debts, href: "/debts", icon: WalletMinimal, module: "debts" },
      { key: "salaries", labelKey: (d) => d.nav.salaries, href: "/salaries", icon: Wallet, module: "salaries" },
    ],
  },
  {
    key: "management",
    labelKey: (d) => d.nav.management,
    items: [
      { key: "employees", labelKey: (d) => d.nav.employees, href: "/employees", icon: Contact, module: "employees" },
      { key: "branches", labelKey: (d) => d.nav.branches, href: "/branches", icon: Building2, module: "branches" },
      { key: "reports", labelKey: (d) => d.nav.reports, href: "/reports", icon: BarChart3, module: "reports" },
    ],
  },
  {
    key: "system",
    labelKey: (d) => d.nav.system,
    items: [
      { key: "notifications", labelKey: (d) => d.nav.notifications, href: "/notifications", icon: Bell, module: "notifications" },
      { key: "settings", labelKey: (d) => d.nav.settings, href: "/settings", icon: Settings, module: "settings" },
    ],
  },
];

/** Student/teacher-specific relabeling: they see "My groups", "My profile", etc. */
export function navForRole(role: Role | null): NavSection[] {
  if (!role) return [];

  const sections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(role, item.module)),
    }))
    .filter((section) => section.items.length > 0);

  if (role === "teacher") {
    return sections.map((s) => ({
      ...s,
      items: s.items.map((item) =>
        item.key === "groups"
          ? { ...item, labelKey: (d: Dict) => d.nav.myGroups }
          : item.key === "schedule"
            ? { ...item, labelKey: (d: Dict) => d.nav.mySchedule }
            : item
      ),
    }));
  }

  if (role === "student") {
    const profileItem: NavItem = {
      key: "profile",
      labelKey: (d) => d.nav.myProfile,
      href: "/profile",
      icon: UserRound,
      module: "profile",
    };
    const mapped = sections.map((s) => ({
      ...s,
      items: s.items.map((item) =>
        item.key === "courses"
          ? { ...item, labelKey: (d: Dict) => d.nav.myCourses }
          : // A student doesn't run campaigns from here — they look up the
            // people teaching them.
            item.key === "communications"
            ? { ...item, labelKey: (d: Dict) => d.nav.myTeachers, icon: Contact }
            : item
      ),
    }));
    // Insert "My profile" right after dashboard
    return mapped.map((s) =>
      s.key === "main" ? { ...s, items: [...s.items, profileItem] } : s
    );
  }

  return sections;
}

const allItems = allSections.flatMap((section) => section.items);

/** The human name of a module, for places outside the sidebar that need to
 *  say which section they mean — the access-denied screen, for one. */
export function moduleLabel(module: ModuleKey, d: Dict): string | undefined {
  if (module === "profile") return d.common.profile;
  return allItems.find((item) => item.module === module)?.labelKey(d);
}
