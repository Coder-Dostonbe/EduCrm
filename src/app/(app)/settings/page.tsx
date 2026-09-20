"use client";

import * as React from "react";
import {
  Bell,
  Building2,
  Check,
  Globe,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Server,
  ShieldCheck,
  Sun,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { AvatarPicker } from "@/components/shared/avatar-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { useT, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { languageNames } from "@/translations";
import { branches } from "@/data";
import { rolePermissions, type ModuleKey } from "@/lib/permissions";
import type { Language, Role } from "@/types";
import { cn } from "@/lib/utils";

type SectionKey =
  | "profile"
  | "security"
  | "notificationsS"
  | "languageS"
  | "appearance"
  | "branchesS"
  | "roles"
  | "paymentS"
  | "communicationS"
  | "systemS";

const sectionIcons: Record<SectionKey, LucideIcon> = {
  profile: UserRound,
  security: ShieldCheck,
  notificationsS: Bell,
  languageS: Globe,
  appearance: Palette,
  branchesS: Building2,
  roles: ShieldCheck,
  paymentS: Wallet,
  communicationS: MessageSquare,
  systemS: Server,
};

const SECTIONS: SectionKey[] = [
  "profile",
  "security",
  "notificationsS",
  "languageS",
  "appearance",
  "branchesS",
  "roles",
  "paymentS",
  "communicationS",
  "systemS",
];

/** Sections that configure the organisation rather than the person: branches,
 *  the role matrix and the server details. Only admins and managers see them. */
const ORG_SECTIONS = new Set<SectionKey>(["branchesS", "roles", "systemS"]);

function sectionsForRole(role: Role | null): SectionKey[] {
  const manages = role === "admin" || role === "manager";
  return manages ? SECTIONS : SECTIONS.filter((key) => !ORG_SECTIONS.has(key));
}

const MODULES: ModuleKey[] = [
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
  "settings",
];

const ROLES: Role[] = ["admin", "manager", "teacher", "student"];

export default function SettingsPage() {
  const t = useT();
  const { language, setLanguage } = useI18n();
  const { user, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const [section, setSection] = React.useState<SectionKey>("profile");
  const visibleSections = sectionsForRole(role);
  // A role change (or a stale state) must never leave an org section on screen.
  const active = visibleSections.includes(section) ? section : "profile";
  const [notifs, setNotifs] = React.useState({ email: true, push: true, sms: false });
  const [methods, setMethods] = React.useState({ cash: true, card: true, transfer: true, online: false });
  const [twoFactor, setTwoFactor] = React.useState(false);

  const moduleLabel = (m: ModuleKey): string => {
    const map: Partial<Record<ModuleKey, string>> = {
      dashboard: t.nav.dashboard,
      students: t.nav.students,
      teachers: t.nav.teachers,
      courses: t.nav.courses,
      groups: t.nav.groups,
      schedule: t.nav.schedule,
      attendance: t.nav.attendance,
      exams: t.nav.exams,
      leads: t.nav.leads,
      communications: t.nav.communications,
      payments: t.nav.payments,
      debts: t.nav.debts,
      salaries: t.nav.salaries,
      employees: t.nav.employees,
      branches: t.nav.branches,
      reports: t.nav.reports,
      settings: t.nav.settings,
      profile: t.common.profile,
      notifications: t.nav.notifications,
    };
    return map[m] ?? m;
  };

  const save = () => toast.success(t.settings.saved);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={t.settings.title} description={t.settings.subtitle} />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Section nav */}
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {visibleSections.map((key) => {
            const Icon = sectionIcons[key];
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/8 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {t.settings.sections[key]}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-4">
          {/* PROFILE */}
          {active === "profile" && (
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.profileInfo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <AvatarPicker name={user?.name ?? ""} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="set-name">{t.auth.fullName}</Label>
                    <Input id="set-name" defaultValue={user?.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-email">{t.common.email}</Label>
                    <Input id="set-email" type="email" defaultValue={user?.email} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="set-phone">{t.common.phone}</Label>
                    <Input id="set-phone" placeholder="+998901234567" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.settings.role}</Label>
                    <Input value={role ? t.roles[role] : ""} disabled />
                  </div>
                </div>
                <Button onClick={save}>{t.common.save}</Button>
              </CardContent>
            </Card>
          )}

          {/* SECURITY */}
          {active === "security" && (
            <>
              <Card className="gap-4 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="text-sm">{t.auth.password}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cur-pw">{t.settings.currentPassword}</Label>
                      <Input id="cur-pw" type="password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pw">{t.auth.newPassword}</Label>
                      <Input id="new-pw" type="password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="conf-pw">{t.auth.confirmPassword}</Label>
                      <Input id="conf-pw" type="password" />
                    </div>
                  </div>
                  <Button onClick={save}>{t.auth.updatePassword}</Button>
                </CardContent>
              </Card>

              <Card className="gap-3 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="text-sm">{t.settings.twoFactor}</CardTitle>
                </CardHeader>
                <CardContent className="px-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">{t.settings.twoFactorHint}</p>
                    <Switch
                      checked={twoFactor}
                      onCheckedChange={(v) => {
                        setTwoFactor(v);
                        toast.success(t.settings.saved);
                      }}
                    />
                  </div>
                  <Separator className="my-4" />
                  <p className="mb-2 text-sm font-medium">{t.settings.sessions}</p>
                  <div className="space-y-2">
                    {[
                      { device: "Chrome · Windows", location: "Toshkent, UZ", current: true },
                      { device: "Safari · iPhone", location: "Toshkent, UZ", current: false },
                    ].map((s) => (
                      <div
                        key={s.device}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm">{s.device}</p>
                          <p className="text-xs text-muted-foreground">{s.location}</p>
                        </div>
                        {s.current ? (
                          <StatusBadge status="active" label={t.common.active} />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive"
                            onClick={() => toast.success(t.settings.saved)}
                          >
                            {t.common.logout}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* NOTIFICATIONS */}
          {active === "notificationsS" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.sections.notificationsS}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-5">
                {(
                  [
                    ["email", t.settings.emailNotifs],
                    ["push", t.settings.pushNotifs],
                    ["sms", t.settings.smsNotifs],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={notifs[key]}
                      onCheckedChange={(v) => {
                        setNotifs((p) => ({ ...p, [key]: v }));
                        toast.success(t.settings.saved);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* LANGUAGE */}
          {active === "languageS" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.interfaceLanguage}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(languageNames) as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        toast.success(t.settings.saved);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                        language === lang
                          ? "border-primary/40 bg-primary/6"
                          : "hover:border-foreground/20 hover:bg-muted/40"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{languageNames[lang]}</p>
                        <p className="text-xs text-muted-foreground uppercase">{lang}</p>
                      </div>
                      {language === lang && <Check className="size-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* APPEARANCE */}
          {active === "appearance" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.theme}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["light", t.settings.light, Sun],
                      ["dark", t.settings.dark, Moon],
                      ["system", t.settings.systemTheme, Monitor],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        theme === value
                          ? "border-primary/40 bg-primary/6"
                          : "hover:border-foreground/20 hover:bg-muted/40"
                      )}
                    >
                      <Icon className={cn("size-4", theme === value && "text-primary")} />
                      <span className="text-sm font-medium">{label}</span>
                      {theme === value && <Check className="ml-auto size-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* BRANCHES */}
          {active === "branchesS" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.branches.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="space-y-2">
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <Building2 className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.address}</p>
                      </div>
                      <StatusBadge
                        status={b.status}
                        label={b.status === "active" ? t.common.active : t.common.inactive}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ROLES & PERMISSIONS */}
          {active === "roles" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.permissionMatrix}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{t.settings.module}</TableHead>
                        {ROLES.map((r) => (
                          <TableHead key={r} className="text-center">
                            {t.roles[r]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MODULES.map((m) => (
                        <TableRow key={m}>
                          <TableCell className="font-medium">{moduleLabel(m)}</TableCell>
                          {ROLES.map((r) => {
                            const allowed = rolePermissions[r].includes(m);
                            return (
                              <TableCell key={r} className="text-center">
                                {allowed ? (
                                  <Check className="mx-auto size-4 text-success" />
                                ) : (
                                  <X className="mx-auto size-4 text-muted-foreground/40" />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PAYMENT SETTINGS */}
          {active === "paymentS" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.sections.paymentS}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <div className="space-y-1.5">
                  <Label>{t.settings.currency}</Label>
                  <Input value="UZS — O'zbek so'mi" disabled />
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium">{t.settings.paymentMethodsS}</p>
                  <div className="divide-y">
                    {(
                      [
                        ["cash", t.payments.methods.cash],
                        ["card", t.payments.methods.card],
                        ["transfer", t.payments.methods.transfer],
                        ["online", t.payments.methods.online],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between py-2.5">
                        <span className="text-sm">{label}</span>
                        <Switch
                          checked={methods[key]}
                          onCheckedChange={(v) => {
                            setMethods((p) => ({ ...p, [key]: v }));
                            toast.success(t.settings.saved);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* COMMUNICATION */}
          {active === "communicationS" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.sections.communicationS}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sms-provider">{t.system.smsProvider}</Label>
                    <Input id="sms-provider" defaultValue="Eskiz.uz" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tg-bot">{t.system.telegramBot}</Label>
                    <Input id="tg-bot" defaultValue="@eduflow_notify_bot" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp">{t.system.smtp}</Label>
                    <Input id="smtp" defaultValue="smtp.eduflow.uz" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sender">{t.system.senderName}</Label>
                    <Input id="sender" defaultValue="EduFlow" />
                  </div>
                </div>
                <Button onClick={save}>{t.common.save}</Button>
              </CardContent>
            </Card>
          )}

          {/* SYSTEM */}
          {active === "systemS" && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.settings.sections.systemS}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="divide-y text-sm">
                  {[
                    [t.system.version, "EduFlow CRM 2.4.0"],
                    [t.system.environment, "Frontend (mock data)"],
                    [t.system.timezone, "Asia/Tashkent (UTC+5)"],
                    [t.system.currencyLabel, "UZS"],
                    [t.system.defaultLanguage, languageNames[language]],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-2.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
