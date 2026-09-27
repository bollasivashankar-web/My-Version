import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { AppSidebar } from "@/components/app-shell/sidebar";
import { CopilotDrawer } from "@/components/ai/copilot-drawer";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { canAccessPath } from "@/lib/feature-access";

/**
 * ============================================================================
 * Authenticated Application Route
 * ============================================================================
 *
 * This route is the frontend navigation guard for all authenticated pages.
 *
 * IMPORTANT SECURITY PRINCIPLE:
 *
 * This route NEVER trusts:
 *
 * - localStorage
 * - sessionStorage
 * - a manually stored JSON user
 * - role information supplied by the browser
 * - a hardcoded user
 * - a default/fallback user
 *
 * Authentication source:
 *
 *     Supabase Auth
 *
 * Authorization source:
 *
 *     Server-side authorization + Supabase RLS
 *
 * This route guard only controls frontend navigation. It is NOT a replacement
 * for server authentication or database Row Level Security.
 */

/**
 * Authentication route.
 */
const AUTH_ROUTE = "/auth";

/**
 * Default page shown after successful authentication.
 */
const DEFAULT_AUTHENTICATED_ROUTE = "/overview";

/**
 * ============================================================================
 * Redirect validation
 * ============================================================================
 *
 * Prevent unsafe external redirects.
 *
 * Allowed:
 *
 *     /overview
 *     /dashboard
 *     /jobs/123
 *
 * Rejected:
 *
 *     https://evil.example.com
 *     //evil.example.com
 *     javascript:...
 */
function getSafeRedirect(value?: string): string {
  if (!value) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  const redirectPath = value.trim();

  if (
    !redirectPath.startsWith("/") ||
    redirectPath.startsWith("//") ||
    redirectPath.includes("\\")
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  return redirectPath;
}

/**
 * ============================================================================
 * Route configuration
 * ============================================================================
 */

export const Route = createFileRoute("/_authenticated")({
  /**
   * This route is currently configured for client-side execution.
   *
   * The actual server-side security boundary remains the authentication
   * middleware and Supabase RLS.
   */
  ssr: false,

  component: AuthenticatedLayout,
});

/**
 * ============================================================================
 * Authenticated application layout
 * ============================================================================
 */

function AuthenticatedLayout() {
  const { user, ready, isSigningOut } = useSession();
  const profileQuery = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (!ready || user || isSigningOut || redirectStarted.current) return;

    redirectStarted.current = true;

    void navigate({
      to: AUTH_ROUTE,
      search: { redirect: getSafeRedirect(location.href) },
      replace: true,
    });
  }, [isSigningOut, location.href, navigate, ready, user]);

  const denied =
    Boolean(profileQuery.data) &&
    !canAccessPath(
      {
        roles: profileQuery.data?.roles ?? [],
        platformRole: profileQuery.data?.platformRole ?? null,
      },
      location.pathname,
    );

  useEffect(() => {
    if (!denied || location.pathname === "/forbidden") return;
    void navigate({ to: "/forbidden", replace: true });
  }, [denied, location.pathname, navigate]);

  /**
   * While Supabase sign-out is being processed, don't render the
   * authenticated application.
   *
   * This prevents a brief flash of protected UI during logout.
   */
  if (!ready || !user || isSigningOut || profileQuery.isPending || denied) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="text-sm text-muted-foreground">
          {isSigningOut
            ? "Signing out..."
            : profileQuery.isPending || denied
              ? "Checking access..."
              : "Verifying session..."}
        </span>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Unable to verify account access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Refresh the page or sign in again. Protected content is not shown when role verification
            fails.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main application navigation */}
      <AppSidebar />

      {/* Main content area */}
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>

      {/* AI assistant / Copilot drawer */}
      <CopilotDrawer />
    </div>
  );
}
