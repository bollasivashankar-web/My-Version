import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-shell/sidebar";
import { CopilotDrawer } from "@/components/ai/copilot-drawer";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

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

  /**
   * --------------------------------------------------------------------------
   * Authentication guard
   * --------------------------------------------------------------------------
   *
   * Supabase Auth is the source of truth for whether a user is authenticated.
   */
  beforeLoad: async ({ location }) => {
    try {
      /**
       * Ask Supabase Auth for the currently authenticated user.
       *
       * This replaces:
       *
       *     authService.getCurrentUser()
       *
       * because that method previously relied on application-managed
       * localStorage state.
       *
       * We do NOT read:
       *
       *     localStorage.getItem("staffinix_auth_state")
       */
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      /**
       * No valid Supabase user means the browser is not authenticated.
       *
       * Fail closed.
       */
      if (error || !user) {
        const requestedPath = `${location.pathname}` + `${location.search}` + `${location.hash}`;

        throw redirect({
          to: AUTH_ROUTE,

          /**
           * Preserve the page the user originally requested.
           *
           * The /auth route should validate this redirect before navigating.
           */
          search: {
            redirect: getSafeRedirect(requestedPath),
          },
        });
      }

      /**
       * Return only the authenticated Supabase user.
       *
       * Do NOT manufacture:
       *
       *     roleLevel
       *     roles
       *     tenantId
       *     isPlatformStaff
       *
       * here.
       *
       * Those values belong to the database/server authorization layer.
       */
      return {
        authUser: user,
      };
    } catch (error) {
      /**
       * TanStack Router redirects are control-flow exceptions.
       *
       * Re-throw them instead of converting them into another error.
       */
      if (error && typeof error === "object" && "isRedirect" in error) {
        throw error;
      }

      /**
       * An unexpected authentication failure must fail closed.
       */
      console.error("[AuthenticatedRoute] Authentication check failed:", error);

      throw redirect({
        to: AUTH_ROUTE,
      });
    }
  },

  component: AuthenticatedLayout,
});

/**
 * ============================================================================
 * Authenticated application layout
 * ============================================================================
 */

function AuthenticatedLayout() {
  const { isSigningOut } = useSession();

  /**
   * While Supabase sign-out is being processed, don't render the
   * authenticated application.
   *
   * This prevents a brief flash of protected UI during logout.
   */
  if (isSigningOut) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="text-sm text-muted-foreground">Signing out...</span>
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
