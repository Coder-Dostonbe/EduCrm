"use client";

import * as React from "react";
import { Mail, MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { studentForUser } from "@/lib/current-student";
import { StudentContacts } from "./student-view";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { groups, messageTemplates, sentMessages as seedMessages, students } from "@/data";
import { formatDate, formatPhone, fullName, initials } from "@/lib/format";
import type { Dict } from "@/translations";
import type { MessageChannel, SentMessage } from "@/types";
import { cn } from "@/lib/utils";

const channelIcon: Record<MessageChannel, React.ComponentType<{ className?: string }>> = {
  sms: MessageSquare,
  telegram: Send,
  email: Mail,
};

const channelColor: Record<MessageChannel, string> = {
  sms: "bg-chart-3/12 text-chart-3",
  telegram: "bg-info/12 text-info",
  email: "bg-chart-5/12 text-chart-5",
};

type TemplateKey = keyof Dict["communications"]["templateKeys"];

export default function CommunicationsPage() {
  const t = useT();
  const { user, role } = useAuth();
  const { loading } = useMockLoading(450);

  const [messages, setMessages] = React.useState<SentMessage[]>(seedMessages);
  const [channel, setChannel] = React.useState<MessageChannel>("sms");
  const [templateId, setTemplateId] = React.useState<string>("");
  const [audience, setAudience] = React.useState<string>("all-debtors");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const recipients = React.useMemo(() => {
    if (audience === "all-students") return students.filter((s) => s.status === "active");
    if (audience === "all-debtors") return students.filter((s) => s.debt > 0);
    return students.filter((s) => s.groupId === audience);
  }, [audience]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = messageTemplates.find((x) => x.id === id);
    if (tpl) {
      setBody(tpl.body);
      setChannel(tpl.channel);
    }
  };

  const send = async () => {
    if (!body.trim() || recipients.length === 0) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date().toISOString().slice(0, 10);
    const created: SentMessage[] = recipients.slice(0, 5).map((s, i) => ({
      id: `msg-new-${Date.now()}-${i}`,
      channel,
      to: s.parentPhone,
      recipientName: s.parentName,
      body: body
        .replace("{student_name}", fullName(s))
        .replace("{parent_name}", s.parentName),
      date: now,
      status: "sent",
    }));
    setMessages((prev) => [...created, ...prev]);
    setSending(false);
    toast.success(t.communications.sent, { description: `${recipients.length}` });
  };

  // Students get a read-only directory of their teachers instead of the
  // outbound messaging console. Branched after the hooks above so the hook
  // order is the same on every render.
  const asStudent = role === "student" ? studentForUser(user) : null;
  if (asStudent) return <StudentContacts student={asStudent} />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t.communications.title} description={t.communications.subtitle} />

      <Tabs defaultValue="compose">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="compose">{t.communications.compose}</TabsTrigger>
            <TabsTrigger value="templates">{t.communications.templates}</TabsTrigger>
            <TabsTrigger value="history">{t.communications.history}</TabsTrigger>
          </TabsList>
        </div>

        {/* COMPOSE */}
        <TabsContent value="compose" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-4 py-5 lg:col-span-2">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.communications.compose}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>{t.communications.channelLabel}</Label>
                    <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
                      <SelectTrigger className="w-full" aria-label={t.communications.channelLabel}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["sms", "telegram", "email"] as MessageChannel[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {t.communications.channels[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t.communications.recipients}</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-students">
                          {t.common.all}: {t.nav.students}
                        </SelectItem>
                        <SelectItem value="all-debtors">{t.debts.debtorCount}</SelectItem>
                        {groups
                          .filter((g) => g.status === "active")
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="msg-body">{t.communications.message}</Label>
                    <Select value={templateId} onValueChange={applyTemplate}>
                      <SelectTrigger size="sm" className="w-auto min-w-40">
                        <SelectValue placeholder={t.communications.selectTemplate} />
                      </SelectTrigger>
                      <SelectContent>
                        {messageTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {t.communications.templateKeys[tpl.key as TemplateKey]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    id="msg-body"
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t.communications.message}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"{student_name}"}, {"{parent_name}"}, {"{amount}"}, {"{course}"}, {"{room}"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t.communications.recipients}:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {recipients.length}
                    </span>
                  </span>
                  <Button onClick={send} disabled={sending || !body.trim() || recipients.length === 0}>
                    <Send className="size-4" />
                    {t.common.send}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">{t.communications.recipients}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <div className="max-h-96 space-y-1 overflow-y-auto">
                  {recipients.slice(0, 30).map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                          {initials(fullName(s))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]">{s.parentName}</p>
                        <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                          {formatPhone(s.parentPhone)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t.common.noResults}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TEMPLATES */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {messageTemplates.map((tpl) => {
              const Icon = channelIcon[tpl.channel];
              return (
                <Card key={tpl.id} className="gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("flex size-9 items-center justify-center rounded-md", channelColor[tpl.channel])}>
                      <Icon className="size-4" />
                    </div>
                    <StatusBadge
                      withDot={false}
                      status="neutral"
                      label={t.communications.channels[tpl.channel]}
                    />
                  </div>
                  <p className="text-sm font-semibold">
                    {t.communications.templateKeys[tpl.key as TemplateKey]}
                  </p>
                  <p className="line-clamp-4 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {tpl.body}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 w-full"
                    onClick={() => {
                      applyTemplate(tpl.id);
                      toast.success(t.communications.useTemplate);
                    }}
                  >
                    <Sparkles className="size-3.5" />
                    {t.communications.useTemplate}
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          {loading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={Send}
              title={t.communications.empty}
              description={t.communications.emptyHint}
            />
          ) : (
            <Card className="gap-0 py-0">
              <CardContent className="divide-y px-0">
                {messages.slice(0, 40).map((m) => {
                  const Icon = channelIcon[m.channel];
                  return (
                    <div key={m.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                      <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md", channelColor[m.channel])}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{m.recipientName}</p>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatPhone(m.to)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                          {formatDate(m.date)}
                        </span>
                        <StatusBadge
                          status={m.status}
                          label={
                            m.status === "delivered"
                              ? t.communications.delivered
                              : m.status === "failed"
                                ? t.communications.failed
                                : m.status === "scheduled"
                                  ? t.communications.scheduled
                                  : t.common.send
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
