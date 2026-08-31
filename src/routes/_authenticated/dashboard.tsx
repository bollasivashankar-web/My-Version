import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDashboardOverview, getRecentActivity } from "@/lib/dashboard.functions";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { useRoleLevel } from "@/hooks/use-role-level";
import {
  FileText,
  Send,
  Users,
  Briefcase,
  Trophy,
  CalendarClock,
  TrendingUp,
  ArrowRight,
  Sparkles,
  UserCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/requirements-constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Staffinix" },
      {
        name: "description",
        content:
          "Unified recruitment desk dashboard for KPIs, submissions trend, pipeline funnel, and team performance.",
      },
    ],
  }),
  component: UnifiedDashboardPage,
});

function UnifiedDashboardPage() {
  const overviewFn = useServerFn(getDashboardOverview);
  const activityFn = useServerFn(getRecentActivity);
  const { data: profile } = useProfile();
  const { isAuthenticated } = useSession();
  const { level } = useRoleLevel();

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => overviewFn(),
    enabled: isAuthenticated,
  });
  const {
    data: activity,
    isLoading: activityLoading,
    isError: activityError,
  } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => activityFn(),
    enabled: isAuthenticated,
  });
  const stats = overview?.kpis;
  const trend = overview?.trend;
  const funnel = overview?.funnel;
  const reqs = overview?.requirements;
  const recruiters = overview?.recruiters;

  const firstName =
    profile?.profile?.full_name?.split(" ")[0] ??
    (level === "L1"
      ? "Platform Admin"
      : level === "L2"
        ? "Executive"
        : level === "L3"
          ? "Developer"
          : "Recruiter");

  const pageDescription =
    level === "L1"
      ? "SaaS Platform Overview — Multi-tenant governance, system health, and administrative controls."
      : level === "L2"
        ? "Executive Dashboard — High-level recruitment desk KPIs, placements, client partnerships, and team performance."
        : level === "L3"
          ? "Developer & Lead Desk — APIs, webhooks, automation status, and recruiter access management."
          : "Live recruitment desk — Active candidates, requisitions, 14-day trends, and team performance.";

  const activeCandidatesCount = stats?.activeConsultants ?? 0;
  const openReqsCount = stats?.openRequirements ?? 0;
  const placementsCount = stats?.activePlacements ?? 0;
  const subsThisWeekCount = stats?.submissionsThisWeek ?? 0;
  const interviewsCount = stats?.interviewsScheduled ?? 0;
  const benchReadyCount = stats?.benchReady ?? 0;
  const hires30dCount = stats?.hiresThisMonth ?? 0;
  const urgentRequirementsCount =
    reqs?.by_priority.find((priority) => priority.name === "urgent")?.value ?? 0;

  const kpiList = [
    {
      label: "Active Candidates",
      value: activeCandidatesCount,
      hint: "Total active candidates on desk",
      icon: Users,
      to: "/candidates",
      badge: `${activeCandidatesCount} current`,
      badgeClass: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: "Open Requisitions",
      value: openReqsCount,
      hint: "Currently active job requisitions",
      icon: FileText,
      to: "/requirements",
      badge: `${urgentRequirementsCount} urgent`,
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    },
    {
      label: "Placements",
      value: placementsCount,
      hint: "Active candidate placements",
      icon: Trophy,
      to: "/placements",
      badge: "QTD",
      badgeClass: "bg-success/10 text-success border-success/20",
    },
    {
      label: "AI Match Accuracy",
      value: "—",
      hint: "Average AI candidate-role fit score",
      icon: Sparkles,
      to: "/matching",
      badge: "No score available",
      badgeClass: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    },
    {
      label: "Submissions this week",
      value: subsThisWeekCount,
      hint: "Candidates submitted to clients this week",
      icon: Send,
      to: "/submissions/board",
      badge: `${subsThisWeekCount} this week`,
      badgeClass: "bg-success/10 text-success border-success/20",
    },
    {
      label: "Interviews scheduled",
      value: interviewsCount,
      hint: "Interviews taking place this week",
      icon: CalendarClock,
      to: "/submissions/board",
      badge: `${interviewsCount} Active`,
      badgeClass: "bg-warning/10 text-warning border-warning/20",
    },
    {
      label: "Bench Ready",
      value: benchReadyCount,
      hint: "Immediate availability bench candidates",
      icon: Briefcase,
      to: "/candidates",
      badge: `${benchReadyCount} Immediate`,
      badgeClass: "bg-info/10 text-info border-info/20",
    },
    {
      label: "Hires (30d)",
      value: hires30dCount,
      hint: "Successful candidate hires in last 30 days",
      icon: UserCheck,
      to: "/submissions/board",
      badge: `${hires30dCount} in 30d`,
      badgeClass: "bg-success/10 text-success border-success/20",
    },
  ];

  const funnelStages = [
    { key: "Submitted", stage: "submitted", color: "bg-blue-500" },
    { key: "Vendor Review", stage: "vendor_review", color: "bg-violet-500" },
    { key: "Client Review", stage: "client_review", color: "bg-purple-500" },
    { key: "Interview", stage: "interview", color: "bg-amber-500" },
    { key: "Offer", stage: "offer", color: "bg-emerald-500" },
    { key: "Hired", stage: "hired", color: "bg-green-600" },
  ].map((item) => ({
    ...item,
    count: funnel?.find((stage) => stage.stage === item.stage)?.count ?? 0,
  }));
  const funnelMax = Math.max(...funnelStages.map((f) => f.count), 1);

  // The API currently returns submitted and hired counts. Do not infer the
  // missing stages from percentages because inferred business metrics look real.
  const trendData = (trend ?? []).map((t) => ({
    label: t.label,
    Submitted: t.submissions,
    Hired: t.hired,
  }));

  return (
    <TooltipProvider>
      <AppTopbar title="Dashboard" />
      <main className="flex-1 space-y-6 p-6 md:p-8">
        <PageHeader title={`Welcome back, ${firstName}`} description={pageDescription} />

        {/* 8 KPIs Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {kpiList.map((k) => {
            const Icon = k.icon;
            return (
              <Link key={k.label} to={k.to} className="group">
                <Card className="border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{k.label}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">{k.hint}</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="rounded-md bg-primary/10 p-1.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <p className="text-2xl font-bold tracking-tight text-foreground">{k.value}</p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-medium", k.badgeClass)}
                      >
                        {k.badge}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Section 2: Recent Trends & Pipeline Funnel */}
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent trends (14 days)</CardTitle>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Submitted
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hired
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-sub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grad-short" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Submitted"
                      stroke="hsl(var(--primary))"
                      fill="url(#grad-sub)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Hired"
                      stroke="#10b981"
                      fill="none"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pipeline funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnelStages.map((f) => {
                const pct = (f.count / funnelMax) * 100;
                return (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground/90">{f.key}</span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {f.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", f.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Requisitions, Priority & Recruiter Leaderboard */}
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Requisitions by status</CardTitle>
            </CardHeader>
            <CardContent>
              {reqs && reqs.by_status.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reqs.by_status}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? v}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                        labelFormatter={(v) =>
                          STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? String(v)
                        }
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {reqs.by_status.map((s) => (
                          <Cell
                            key={s.name}
                            fill={
                              s.name === "open"
                                ? "#3b82f6"
                                : s.name === "closed"
                                  ? "#10b981"
                                  : "#ef4444"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                  No requisitions yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Priority mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reqs && reqs.by_priority.length > 0 ? (
                reqs.by_priority.map((p) => {
                  const total = reqs.by_priority.reduce((a, b) => a + b.value, 0);
                  const pct = total ? (p.value / total) * 100 : 0;
                  const label = PRIORITY_LABEL[p.name as keyof typeof PRIORITY_LABEL] ?? p.name;
                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{p.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            p.name === "urgent"
                              ? "bg-destructive"
                              : p.name === "high"
                                ? "bg-warning"
                                : p.name === "medium"
                                  ? "bg-primary"
                                  : "bg-muted-foreground",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">No priority data.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recruiter leaderboard</CardTitle>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <TrendingUp className="h-3 w-3" /> QTD
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {(recruiters ?? []).map((r, i) => (
                <div
                  key={r.id || r.name}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-surface/60 p-2 transition-all hover:border-primary/30"
                >
                  <span className="w-4 text-center font-mono text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={"avatar_url" in r ? (r.avatar_url ?? undefined) : undefined}
                    />
                    <AvatarFallback className="bg-surface-2 text-[10px] font-semibold">
                      {initials(r.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.hires} hires · {r.submissions} submissions
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                  >
                    {r.hires} Hires
                  </Badge>
                </div>
              ))}
              {(!recruiters || recruiters.length === 0) && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No recruiter activity yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Jump in & Your Activity Cards (Hidden for L2 Executive View) */}
        {level !== "L2" && (
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Jump in Card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Jump in
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Link
                  to="/requirements"
                  className="group p-3 rounded-lg border border-border bg-surface/40 hover:bg-muted/40 hover:border-primary/40 transition-all"
                >
                  <div className="font-semibold text-xs text-foreground group-hover:text-primary">
                    Requisitions
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Review active job roles, client details, and parsed job descriptions.
                  </p>
                </Link>

                <Link
                  to="/candidates"
                  className="group p-3 rounded-lg border border-border bg-surface/40 hover:bg-muted/40 hover:border-primary/40 transition-all"
                >
                  <div className="font-semibold text-xs text-foreground group-hover:text-primary">
                    Bench Candidates
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Browse candidate bench and view full original raw resumes.
                  </p>
                </Link>

                <Link
                  to="/submissions/board"
                  className="group p-3 rounded-lg border border-border bg-surface/40 hover:bg-muted/40 hover:border-primary/40 transition-all"
                >
                  <div className="font-semibold text-xs text-foreground group-hover:text-primary">
                    Submissions Board
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Track candidate submission stages from Submitted to Hired.
                  </p>
                </Link>
              </CardContent>
            </Card>

            {/* Your Activity Card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" /> Your Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(activity ?? []).slice(0, 5).map((a: any) => {
                  const item = formatActivityItem(a);
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 text-xs pb-2.5 border-b border-border/50 last:border-0 last:pb-0"
                    >
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0 mt-0.5">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground text-xs">{item.title}</p>
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!activity || activity.length === 0) && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No recent activity.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </TooltipProvider>
  );
}

function formatActivityItem(a: any) {
  if (a.metadata?.title && a.metadata?.description) {
    return {
      title: a.metadata.title,
      details: a.metadata.description,
    };
  }

  const action = String(a.action || "");
  const entityId = String(a.entity_id || "");

  return {
    title: action
      .split(".")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    details:
      a.metadata?.description ||
      (entityId
        ? `Activity logged for ${a.entity_type || "item"} #${entityId}`
        : "Activity recorded."),
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
