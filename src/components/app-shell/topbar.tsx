import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { beginSignOut, cancelSignOut } from "@/hooks/use-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { CopilotDrawer } from "@/components/ai/copilot-drawer";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  recruiter: "Recruiter",
  account_manager: "Account Manager",
  delivery_manager: "Delivery Manager",
  marketing_executive: "Marketing",
};

export function AppTopbar({ title }: { title: string }) {
  const { data } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const rawName = data?.profile?.full_name ?? data?.email ?? "Signed-in user";
  const cleanName = rawName.replace(/\s*\(.*?\)/g, "").trim() || "Signed-in user";

  const initials =
    cleanName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  async function handleSignOut() {
    flushSync(() => beginSignOut());
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      cancelSignOut();
      navigate({ to: "/auth", replace: true });
    }
  }

  const primaryRole = data?.roles?.[0];

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {primaryRole && (
          <Badge variant="outline" className="hidden text-[10px] md:inline-flex">
            {ROLE_LABEL[primaryRole] ?? primaryRole.replace(/_/g, " ")}
          </Badge>
        )}

        <CopilotDrawer />

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-accent/50">
              <Avatar className="h-7 w-7">
                <AvatarImage src={data?.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-semibold text-foreground md:inline-block">
                {cleanName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {data?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings/profile" })}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
