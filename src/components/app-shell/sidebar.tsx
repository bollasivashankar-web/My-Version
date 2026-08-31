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
  Mail,
  KanbanSquare,
  Sparkles,
  UserRound,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { StaffinixLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { useTenancy } from "@/hooks/use-tenancy";
import { RoleLevel } from "@/lib/auth-service";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useProfile();
  const { data: tenancy } = useTenancy();

  const level: RoleLevel = (data as any)?.level ?? "L4";

  // L1 — Platform Owner (Staffinix SaaS Admin)
  const l1Items: { section: string; items: NavItem[] }[] = [
    {
      section: "SaaS Administration",
      items: [
        { to: "/platform", label: "Platform Console", icon: Crown },
        { to: "/tenants/new", label: "New Tenant Registration", icon: Building2 },
        { to: "/audit", label: "Audit Logs", icon: ScrollText },
      ],
    },
  ];

  // L2 — Company Super Admin (Client Organization Executive / VP)
  const l2Items: { section: string; items: NavItem[] }[] = [
    {
      section: "Executive Workspace",
      items: [
        { to: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
        { to: "/placements", label: "Placements & Revenue", icon: Trophy },
        { to: "/clients", label: "Client Accounts", icon: Building2 },
        { to: "/vendors", label: "Vendors", icon: Handshake },
        { to: "/users", label: "Company Team", icon: UserRound },
        { to: "/audit", label: "Audit Logs", icon: ScrollText },
      ],
    },
  ];

  // L3 — Dev Admin / Technical Lead
  const l3Items: { section: string; items: NavItem[] }[] = [
    {
      section: "Developer Console",
      items: [
        { to: "/developer", label: "Dev Console & APIs", icon: Code2 },
        { to: "/access-request", label: "Recruiter Approvals", icon: Crown },
      ],
    },
  ];

  // L4 — Client Recruiter (Individual Contributor)
  const l4Items: { section: string; items: NavItem[] }[] = [
    {
      section: "Recruiter Desk",
      items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/requirements", label: "Requisitions", icon: FileText },
        { to: "/candidates", label: "Bench Candidates", icon: Users },
        { to: "/matching", label: "AI Matching", icon: Sparkles },
        { to: "/tailoring", label: "Resume Tailoring", icon: Wand2 },
        { to: "/submissions/board", label: "Pipeline Tracker", icon: KanbanSquare },
        { to: "/vendors", label: "Vendors", icon: Handshake },
        { to: "/access-request", label: "Request Access", icon: Crown },
      ],
    },
  ];

  const currentNavGroups =
    level === "L1" ? l1Items : level === "L2" ? l2Items : level === "L3" ? l3Items : l4Items;

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
      </nav>

      <div className="border-t border-sidebar-border p-3">
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
          <div className="mt-2 truncate rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground/70">
            {tenancy.tenant.name}
            <span className="ml-1 capitalize text-sidebar-foreground/40">
              · {tenancy.tenant.plan}
            </span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{level} View</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {level === "L1"
              ? "SaaS Owner"
              : level === "L2"
                ? "Exec VP"
                : level === "L3"
                  ? "Dev Lead"
                  : "Recruiter"}
          </span>
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
