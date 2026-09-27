import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Trophy,
  Building2,
  Handshake,
  UsersRound,
  Crown,
  Code2,
  Wand2,
  KanbanSquare,
  Sparkles,
  UserRound,
  ScrollText,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { StaffinixLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { useTenancy } from "@/hooks/use-tenancy";
import { canAccessFeature, type Feature, type FeatureAccessIdentity } from "@/lib/feature-access";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: Feature;
};

const NAV_GROUPS: ReadonlyArray<{ section: string; items: readonly NavItem[] }> = [
  {
    section: "Workspace",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard" }],
  },
  {
    section: "Talent Operations",
    items: [
      { to: "/requirements", label: "Requisitions", icon: FileText, feature: "requirements" },
      { to: "/candidates", label: "Candidates", icon: Users, feature: "candidates" },
      { to: "/matching", label: "AI Matching", icon: Sparkles, feature: "matching" },
      { to: "/tailoring", label: "Resume Tailoring", icon: Wand2, feature: "tailoring" },
      {
        to: "/submissions/board",
        label: "Pipeline Tracker",
        icon: KanbanSquare,
        feature: "submissions",
      },
      { to: "/interviews", label: "Interviews", icon: CalendarClock, feature: "interviews" },
    ],
  },
  {
    section: "Relationships & Delivery",
    items: [
      { to: "/clients", label: "Client Accounts", icon: Building2, feature: "clients" },
      { to: "/vendors", label: "Vendors", icon: Handshake, feature: "vendors" },
      { to: "/placements", label: "Placements & Revenue", icon: Trophy, feature: "placements" },
      { to: "/recruiters", label: "Recruiter Team", icon: UsersRound, feature: "recruiters" },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/users", label: "Company Team", icon: UserRound, feature: "users" },
      { to: "/audit", label: "Audit Logs", icon: ScrollText, feature: "audit" },
      { to: "/developer", label: "Dev Console & APIs", icon: Code2, feature: "developer" },
      { to: "/architecture", label: "Architecture", icon: ShieldCheck, feature: "developer" },
    ],
  },
  {
    section: "SaaS Administration",
    items: [
      { to: "/platform", label: "Platform Console", icon: Crown, feature: "platform" },
      {
        to: "/tenants/new",
        label: "New Tenant Registration",
        icon: Building2,
        feature: "platform",
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useProfile();
  const { data: tenancy } = useTenancy();
  const level = data?.level ?? null;
  const identity: FeatureAccessIdentity = {
    roles: data?.roles ?? [],
    platformRole: data?.platformRole ?? null,
  };
  const currentNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessFeature(identity, item.feature)),
  })).filter((group) => group.items.length > 0);
  const isPlatformApprover =
    data?.platformRole === "platform_owner" || data?.platformRole === "platform_admin";
  const isUnprovisioned = identity.roles.length === 0 && !identity.platformRole;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex h-screen sticky top-0 overflow-hidden">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <StaffinixLogo />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {currentNavGroups.map((group) => (
          <NavGroup
            key={group.section}
            title={group.section}
            items={group.items}
            pathname={pathname}
          />
        ))}
        {(isPlatformApprover || isUnprovisioned) && (
          <NavGroup
            title="Access"
            items={[
              {
                to: "/access-request",
                label: isPlatformApprover ? "Platform Access Requests" : "Request Access",
                icon: Crown,
                feature: "dashboard",
              },
            ]}
            pathname={pathname}
          />
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        <Link
          to="/settings/profile"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname.startsWith("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <UserRound className="h-4 w-4" />
          Profile
        </Link>
        {tenancy?.tenant && (
          <div className="truncate rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground/70">
            {tenancy.tenant.name}
            <span className="ml-1 capitalize text-sidebar-foreground/40">
              · {tenancy.tenant.plan}
            </span>
          </div>
        )}

        <div className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 p-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-sidebar-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Assigned Access</span>
            </div>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {level ?? "Pending"}
            </span>
          </div>
          <div className="mt-1.5 text-center text-[9px] text-sidebar-foreground/60 font-mono">
            {data?.roleTitle ?? "Awaiting role assignment"}
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
        {title}
      </p>
      <div className="mt-1 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
