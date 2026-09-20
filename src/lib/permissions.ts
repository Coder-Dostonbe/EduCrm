import type { Role } from "@/types";

/** Every module in the app. Each one is also the first segment of its route,
 *  which is what lets `moduleForPath` guard the routes from this same list. */
export const moduleKeys = [
  "dashboard",
  "students",
  "teachers",
  "courses",
  "groups",
  "schedule",
  "attendance",
  "exams",
  "leads",
  "communications",
  "payments",
  "debts",
  "salaries",
  "employees",
  "branches",
  "reports",
  "notifications",
  "settings",
  "profile",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];

/** Which modules each role can access. Admin gets everything — spread from
 *  `moduleKeys` so a new module is admin-visible without a second edit. */
export const rolePermissions: Record<Role, ModuleKey[]> = {
  admin: [...moduleKeys],
  manager: [
    "dashboard",
    "students",
    "teachers",
    "courses",
    "groups",
    "schedule",
    "attendance",
    "exams",
    "leads",
    "communications",
    "payments",
    "debts",
    "reports",
    "notifications",
    "settings",
    "profile",
  ],
  teacher: [
    "dashboard",
    "groups",
    "students",
    "schedule",
    "attendance",
    "exams",
    "notifications",
    "settings",
    "profile",
  ],
  // Schedule and attendance are teaching tools — a student is a subject of
  // attendance, not a keeper of it, so neither section is theirs.
  student: [
    "dashboard",
    "profile",
    "courses",
    "exams",
    "payments",
    "communications",
    "notifications",
    "settings",
  ],
};

export function canAccess(role: Role | null, module: ModuleKey): boolean {
  if (!role) return false;
  return rolePermissions[role].includes(module);
}

const knownModules = new Set<string>(moduleKeys);

/** The module a route belongs to, or null for a path no module owns.
 *
 *  Detail routes live under their module (`/students/42` → `students`), so the
 *  first segment is the whole answer. A null means "not a module route" and is
 *  deliberately left open — the route guard only speaks for the modules it
 *  knows, and an unrecognised path is a 404's problem, not a permission's.
 */
export function moduleForPath(pathname: string): ModuleKey | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && knownModules.has(segment) ? (segment as ModuleKey) : null;
}
