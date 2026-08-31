import { supabase } from "@/integrations/supabase/client";

/**
 * ============================================================================
 * Authentication & Authorization Service
 * ============================================================================
 *
 * SECURITY ARCHITECTURE
 * ----------------------------------------------------------------------------
 *
 * Authentication:
 *   Supabase Auth
 *
 * Application identity:
 *   profiles.id === auth.users.id
 *
 * Application roles:
 *   user_roles
 *
 * Platform roles:
 *   platform_admins
 *
 * Organization:
 *   profiles.tenant_id -> tenants.id
 *
 * Database authorization:
 *   Supabase Row Level Security (RLS)
 *
 * IMPORTANT:
 *
 * This service is NOT a security boundary.
 *
 * Frontend role checks are used only for:
 *   - UI visibility
 *   - navigation
 *   - UX
 *
 * Sensitive operations MUST be independently protected by:
 *   - Supabase RLS
 *   - server-side authorization
 *   - Edge Functions / server APIs where appropriate
 *
 * NEVER:
 *   - trust localStorage as authentication
 *   - trust sessionStorage as authentication
 *   - create fallback users
 *   - create fake users
 *   - assign roles from the browser
 *   - assign tenants from the browser
 *   - treat frontend role checks as authorization
 *   - automatically grant privileged roles
 * ============================================================================
 */

/* ============================================================================
 * Types
 * ========================================================================== */

export type RoleLevel = "L1" | "L2" | "L3" | "L4";

export type ApplicationRole = "user" | "recruiter" | "admin" | "super_admin";

export type PlatformRole = "platform_owner" | "platform_admin" | "platform_support";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;

  /**
   * UI compatibility level.
   *
   * IMPORTANT:
   * This is NOT an authorization boundary.
   */
  roleLevel: RoleLevel;

  /**
   * Human-readable UI role title.
   */
  roleTitle: string;

  /**
   * Application roles loaded from user_roles.
   */
  roles: string[];

  /**
   * Tenant assigned by the database.
   */
  tenantId: string | null;

  /**
   * Tenant display name.
   */
  tenantName: string | null;

  /**
   * True when the user exists in platform_admins.
   */
  isPlatformStaff: boolean;
}

/**
 * Authentication state listener.
 */
type AuthListener = (user: UserProfile | null) => void;

/**
 * Database representation of public.profiles.
 */
interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string | null;
  is_active: boolean;
}

/**
 * Database representation of user_roles.
 */
interface UserRoleRow {
  role: string | null;
}

/**
 * Database representation of platform_admins.
 */
interface PlatformAdminRow {
  role: string | null;
}

/**
 * Database representation of tenants.
 */
interface TenantRow {
  name: string | null;
}

/* ============================================================================
 * Error types
 * ========================================================================== */

export type AuthServiceErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_QUERY_ERROR"
  | "ROLE_QUERY_ERROR"
  | "SESSION_ERROR"
  | "SIGN_OUT_ERROR";

export class AuthServiceError extends Error {
  public readonly code: AuthServiceErrorCode;

  constructor(message: string, code: AuthServiceErrorCode) {
    super(message);

    this.name = "AuthServiceError";
    this.code = code;

    Object.setPrototypeOf(this, AuthServiceError.prototype);
  }
}

/* ============================================================================
 * Role priority
 * ========================================================================== */

/**
 * Application role priority.
 *
 * This is used ONLY to determine the role displayed by the frontend when a
 * user has multiple application roles.
 *
 * It does NOT grant permissions.
 */
const APPLICATION_ROLE_PRIORITY: readonly ApplicationRole[] = [
  "super_admin",
  "admin",
  "recruiter",
  "user",
];

/**
 * Platform role priority.
 *
 * Platform roles always take precedence over company/application roles for
 * frontend role presentation.
 */
const PLATFORM_ROLE_PRIORITY: readonly PlatformRole[] = [
  "platform_owner",
  "platform_admin",
  "platform_support",
];

/**
 * Events which require application-profile refresh.
 */
const PROFILE_REFRESH_EVENTS = new Set([
  "SIGNED_IN",
  "INITIAL_SESSION",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
]);

/* ============================================================================
 * Authentication Service
 * ========================================================================== */

export class AuthService {
  /**
   * In-memory application profile.
   *
   * IMPORTANT:
   *
   * This is a UI cache only.
   *
   * It is never used as proof of authentication.
   */
  private currentUser: UserProfile | null = null;

  /**
   * Prevent duplicate initialization.
   */
  private initialized = false;

  /**
   * Initialization promise.
   *
   * Prevents multiple components from simultaneously initializing the service.
   */
  private initializationPromise: Promise<UserProfile | null> | null = null;

  /**
   * Authentication/profile subscribers.
   */
  private readonly listeners = new Set<AuthListener>();

  /**
   * Supabase authentication subscription.
   */
  private authSubscription: {
    unsubscribe: () => void;
  } | null = null;

  /**
   * State version used to prevent stale asynchronous authentication operations
   * from overwriting newer authentication state.
   */
  private stateVersion = 0;

  /* ==========================================================================
   * Initialize
   * ======================================================================== */

  public async initialize(): Promise<UserProfile | null> {
    /**
     * Already initialized.
     */
    if (this.initialized) {
      return this.currentUser;
    }

    /**
     * Another initialization is already running.
     */
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeInternal();

    try {
      return await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initializeInternal(): Promise<UserProfile | null> {
    if (this.initialized) {
      return this.currentUser;
    }

    this.initialized = true;

    /**
     * Subscribe before checking the current authentication state.
     *
     * This reduces the chance of missing an authentication event during
     * startup.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      /**
       * Do not perform awaited Supabase/database operations directly inside
       * the auth callback.
       *
       * Defer them to another microtask.
       */
      queueMicrotask(() => {
        void this.handleAuthStateChange(event, session?.user?.id ?? null);
      });
    });

    this.authSubscription = subscription;

    try {
      /**
       * Supabase Auth is the authentication source of truth.
       */
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("[AuthService] Failed to retrieve authenticated user:", error.message);

        this.clearCurrentUser();

        return null;
      }

      /**
       * No authenticated Supabase user.
       */
      if (!user) {
        this.clearCurrentUser();

        return null;
      }

      const version = this.stateVersion;

      const profile = await this.loadUserProfile(user.id);

      /**
       * Prevent stale initialization from overwriting newer authentication
       * state.
       */
      if (version !== this.stateVersion) {
        return this.currentUser;
      }

      this.currentUser = profile;
      this.notify();

      return profile;
    } catch (error) {
      console.error("[AuthService] Authentication initialization failed:", error);

      this.clearCurrentUser();

      return null;
    }
  }

  /* ==========================================================================
   * Sign in
   * ======================================================================== */

  public async signIn(emailInput: string, passwordInput: string): Promise<UserProfile> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    /**
     * Validate email.
     */
    if (!email) {
      throw new AuthServiceError("Email address is required.", "VALIDATION_ERROR");
    }

    /**
     * Validate password.
     */
    if (!password) {
      throw new AuthServiceError("Password is required.", "VALIDATION_ERROR");
    }

    /**
     * Invalidate any previous asynchronous authentication operation.
     */
    this.stateVersion += 1;

    /**
     * Authenticate using Supabase.
     *
     * There is NO:
     *   - fallback account
     *   - demo account
     *   - hardcoded user
     *   - automatic role
     *   - automatic tenant
     */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    /**
     * Authentication failure MUST terminate the operation.
     */
    if (error || !data.user) {
      console.error("[AuthService] Supabase sign-in failed:", error?.message);

      throw new AuthServiceError(
        this.getSafeAuthErrorMessage(error?.message),
        "AUTHENTICATION_ERROR",
      );
    }

    const userId = data.user.id;
    const version = this.stateVersion;

    try {
      /**
       * Load application profile using ONLY the authenticated Supabase user ID.
       */
      const profile = await this.loadUserProfile(userId);

      /**
       * Prevent stale sign-in result from overwriting a newer auth state.
       */
      if (version !== this.stateVersion) {
        throw new AuthServiceError(
          "Authentication state changed. Please sign in again.",
          "AUTHENTICATION_ERROR",
        );
      }

      this.currentUser = profile;
      this.notify();

      return profile;
    } catch (error) {
      console.error("[AuthService] Authenticated user has no valid application profile:", error);

      /**
       * Authentication succeeded but application authorization/profile failed.
       *
       * Fail closed.
       */
      await this.safeSignOut();

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError(
        "Your account is authenticated but is not configured for this application.",
        "PROFILE_NOT_FOUND",
      );
    }
  }

  /* ==========================================================================
   * Get authenticated Supabase user
   * ======================================================================== */

  public async getAuthenticatedUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("[AuthService] Failed to retrieve authenticated user:", error.message);

      return null;
    }

    return user;
  }

  /* ==========================================================================
   * Get current application profile
   * ======================================================================== */

  public async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = await this.getAuthenticatedUser();

    if (!user) {
      this.clearCurrentUser();

      return null;
    }

    const version = this.stateVersion;

    try {
      const profile = await this.loadUserProfile(user.id);

      if (version !== this.stateVersion) {
        return this.currentUser;
      }

      this.currentUser = profile;
      this.notify();

      return profile;
    } catch (error) {
      console.error("[AuthService] Failed to load current user profile:", error);

      this.clearCurrentUser();

      return null;
    }
  }

  /* ==========================================================================
   * Get current cached profile
   * ======================================================================== */

  /**
   * Returns the current in-memory UI profile.
   *
   * IMPORTANT:
   *
   * This method does NOT verify authentication.
   *
   * Never use this method as a security check.
   *
   * For actual authentication use:
   *
   *   getAuthenticatedUser()
   *
   * or:
   *
   *   getCurrentUserProfile()
   */
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /* ==========================================================================
   * Get Supabase session
   * ======================================================================== */

  public async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthService] Failed to retrieve Supabase session:", error.message);

      return null;
    }

    return data.session;
  }

  /* ==========================================================================
   * Refresh application profile
   * ======================================================================== */

  public async refreshUser(): Promise<UserProfile | null> {
    const user = await this.getAuthenticatedUser();

    if (!user) {
      this.clearCurrentUser();

      return null;
    }

    const version = this.stateVersion;

    try {
      const profile = await this.loadUserProfile(user.id);

      if (version !== this.stateVersion) {
        return this.currentUser;
      }

      this.currentUser = profile;
      this.notify();

      return profile;
    } catch (error) {
      console.error("[AuthService] Failed to refresh user profile:", error);

      this.clearCurrentUser();

      return null;
    }
  }

  /* ==========================================================================
   * Sign out
   * ======================================================================== */

  public async signOut(): Promise<void> {
    /**
     * Invalidate pending authentication/profile operations first.
     */
    this.stateVersion += 1;

    const { error } = await supabase.auth.signOut();

    /**
     * Always clear the local application profile.
     */
    this.clearCurrentUser();

    if (error) {
      console.error("[AuthService] Supabase sign-out failed:", error.message);

      throw new AuthServiceError("Failed to sign out. Please try again.", "SIGN_OUT_ERROR");
    }
  }

  /* ==========================================================================
   * Subscribe
   * ======================================================================== */

  public subscribe(callback: AuthListener): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /* ==========================================================================
   * UI role helpers
   * ======================================================================== */

  /**
   * IMPORTANT:
   *
   * These methods are UI helpers only.
   *
   * They MUST NOT be used to authorize sensitive operations.
   *
   * Real authorization must be enforced by:
   *   - Supabase RLS
   *   - server-side authorization
   *   - Edge Functions / server APIs
   */

  public hasRole(role: string): boolean {
    const normalizedRole = role.trim().toLowerCase();

    if (!normalizedRole || !this.currentUser) {
      return false;
    }

    return this.currentUser.roles.some(
      (userRole) => userRole.trim().toLowerCase() === normalizedRole,
    );
  }

  public hasAnyRole(roles: string[]): boolean {
    if (!this.currentUser || roles.length === 0) {
      return false;
    }

    return roles.some((role) => this.hasRole(role));
  }

  public hasAllRoles(roles: string[]): boolean {
    if (!this.currentUser || roles.length === 0) {
      return false;
    }

    return roles.every((role) => this.hasRole(role));
  }

  public isPlatformStaff(): boolean {
    return this.currentUser?.isPlatformStaff === true;
  }

  public getRoleLevel(): RoleLevel | null {
    return this.currentUser?.roleLevel ?? null;
  }

  public getTenantId(): string | null {
    return this.currentUser?.tenantId ?? null;
  }

  /* ==========================================================================
   * Destroy
   * ======================================================================== */

  public destroy(): void {
    /**
     * Invalidate all pending asynchronous operations.
     */
    this.stateVersion += 1;

    this.authSubscription?.unsubscribe();

    this.authSubscription = null;

    this.listeners.clear();

    this.currentUser = null;

    this.initialized = false;

    this.initializationPromise = null;
  }

  /* ==========================================================================
   * Load application profile
   * ======================================================================== */

  private async loadUserProfile(userId: string): Promise<UserProfile> {
    if (!userId?.trim()) {
      throw new AuthServiceError("Invalid authenticated user ID.", "PROFILE_NOT_FOUND");
    }

    /* ------------------------------------------------------------------------
     * Profile
     * ---------------------------------------------------------------------- */

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
          id,
          email,
          full_name,
          tenant_id,
          is_active
        `,
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[AuthService] Profile query failed:", profileError);

      throw new AuthServiceError("Unable to load your account profile.", "PROFILE_QUERY_ERROR");
    }

    if (!profile) {
      throw new AuthServiceError(
        "No application profile exists for this account.",
        "PROFILE_NOT_FOUND",
      );
    }

    const typedProfile = profile as ProfileRow;

    /**
     * Inactive accounts cannot access the application.
     */
    if (!typedProfile.is_active) {
      throw new AuthServiceError("Your account is inactive.", "PROFILE_NOT_FOUND");
    }

    /* ------------------------------------------------------------------------
     * Application roles
     * ---------------------------------------------------------------------- */

    const { data: roleRows, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("[AuthService] Role query failed:", rolesError);

      throw new AuthServiceError("Unable to load your account permissions.", "ROLE_QUERY_ERROR");
    }

    const roles = this.normalizeRoles(roleRows);

    /* ------------------------------------------------------------------------
     * Platform role
     * ---------------------------------------------------------------------- */

    const { data: platformAdmin, error: platformAdminError } = await supabase
      .from("platform_admins")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (platformAdminError) {
      console.error("[AuthService] Platform admin query failed:", platformAdminError);

      throw new AuthServiceError("Unable to load your platform permissions.", "ROLE_QUERY_ERROR");
    }

    const typedPlatformAdmin = platformAdmin as PlatformAdminRow | null;

    const platformRole = this.normalizePlatformRole(typedPlatformAdmin?.role ?? null);

    /* ------------------------------------------------------------------------
     * Tenant
     * ---------------------------------------------------------------------- */

    let tenantName: string | null = null;

    if (typedProfile.tenant_id) {
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", typedProfile.tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error("[AuthService] Tenant query failed:", tenantError);

        throw new AuthServiceError("Unable to load your organization.", "PROFILE_QUERY_ERROR");
      }

      const typedTenant = tenant as TenantRow | null;

      tenantName = typedTenant?.name ?? null;
    }

    /* ------------------------------------------------------------------------
     * Effective UI role
     * ---------------------------------------------------------------------- */

    const effectiveRole = this.getEffectiveRole(roles, platformRole);

    const roleLevel = this.getRoleLevelFromRole(effectiveRole);

    const roleTitle = this.getRoleTitle(effectiveRole);

    return {
      id: typedProfile.id,
      email: typedProfile.email,
      fullName: typedProfile.full_name,
      roleLevel,
      roleTitle,
      roles,
      tenantId: typedProfile.tenant_id,
      tenantName,
      isPlatformStaff: Boolean(platformRole),
    };
  }

  /* ==========================================================================
   * Normalize application roles
   * ======================================================================== */

  private normalizeRoles(roleRows: unknown): string[] {
    if (!Array.isArray(roleRows)) {
      return [];
    }

    const rows = roleRows as UserRoleRow[];

    return [
      ...new Set(
        rows
          .map((row) => (typeof row?.role === "string" ? row.role.trim().toLowerCase() : null))
          .filter((role): role is string => Boolean(role)),
      ),
    ];
  }

  /* ==========================================================================
   * Normalize platform role
   * ======================================================================== */

  private normalizePlatformRole(role: string | null): PlatformRole | null {
    if (!role) {
      return null;
    }

    const normalizedRole = role.trim().toLowerCase();

    if (PLATFORM_ROLE_PRIORITY.includes(normalizedRole as PlatformRole)) {
      return normalizedRole as PlatformRole;
    }

    /**
     * Unknown platform roles are not automatically trusted.
     */
    console.warn(`[AuthService] Unknown platform role "${normalizedRole}"`);

    return null;
  }

  /* ==========================================================================
   * Determine effective UI role
   * ======================================================================== */

  private getEffectiveRole(roles: string[], platformRole: PlatformRole | null): string {
    /**
     * Platform roles have explicit precedence.
     */
    if (platformRole) {
      return platformRole;
    }

    /**
     * Application roles use deterministic priority.
     *
     * NEVER use roles[0].
     */
    for (const role of APPLICATION_ROLE_PRIORITY) {
      if (roles.includes(role)) {
        return role;
      }
    }

    /**
     * Unknown roles do not grant elevated UI privileges.
     */
    return "user";
  }

  /* ==========================================================================
   * Role level
   * ======================================================================== */

  private getRoleLevelFromRole(role: string): RoleLevel {
    switch (role.toLowerCase()) {
      case "platform_owner":
      case "super_admin":
        return "L4";

      case "platform_admin":
      case "admin":
        return "L3";

      case "platform_support":
      case "recruiter":
        return "L2";

      case "user":
      default:
        return "L1";
    }
  }

  /* ==========================================================================
   * Role title
   * ======================================================================== */

  private getRoleTitle(role: string): string {
    switch (role.toLowerCase()) {
      case "platform_owner":
        return "Platform Owner";

      case "platform_admin":
        return "Platform Admin";

      case "platform_support":
        return "Platform Support";

      case "super_admin":
        return "Super Admin";

      case "admin":
        return "Administrator";

      case "recruiter":
        return "Recruiter";

      case "user":
        return "User";

      default:
        return role.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
    }
  }

  /* ==========================================================================
   * Supabase authentication events
   * ======================================================================== */

  private async handleAuthStateChange(event: string, userId: string | null): Promise<void> {
    /**
     * Every authentication event represents a new state version.
     *
     * This prevents stale async requests from winning races.
     */
    const version = ++this.stateVersion;

    try {
      /**
       * No authenticated user.
       */
      if (!userId) {
        this.clearCurrentUser();

        return;
      }

      /**
       * Ignore events that don't require an application-profile refresh.
       */
      if (!PROFILE_REFRESH_EVENTS.has(event)) {
        return;
      }

      /**
       * Load the profile using ONLY the authenticated Supabase user ID.
       */
      const profile = await this.loadUserProfile(userId);

      /**
       * Authentication may have changed while the database request was
       * running.
       */
      if (version !== this.stateVersion) {
        return;
      }

      this.currentUser = profile;

      this.notify();
    } catch (error) {
      /**
       * Do not leave stale privileged information in memory.
       */
      if (version !== this.stateVersion) {
        return;
      }

      console.error("[AuthService] Authentication state update failed:", error);

      this.clearCurrentUser();
    }
  }

  /* ==========================================================================
   * Authentication error sanitization
   * ======================================================================== */

  private getSafeAuthErrorMessage(message?: string): string {
    const normalized = message?.toLowerCase() ?? "";

    /**
     * Email confirmation is a useful user-facing state.
     */
    if (normalized.includes("email not confirmed")) {
      return "Please verify your email address before signing in.";
    }

    /**
     * Rate limiting.
     */
    if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
      return "Too many login attempts. Please wait and try again.";
    }

    /**
     * Never expose account-specific authentication information.
     */
    if (
      normalized.includes("invalid login credentials") ||
      normalized.includes("invalid email") ||
      normalized.includes("invalid password")
    ) {
      return "Invalid email or password.";
    }

    return "Unable to sign in. Please check your credentials and try again.";
  }

  /* ==========================================================================
   * Safe sign-out
   * ======================================================================== */

  private async safeSignOut(): Promise<void> {
    /**
     * Invalidate pending operations before attempting cleanup.
     */
    this.stateVersion += 1;

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[AuthService] Failed to clean up authentication session:", error);
    } finally {
      this.clearCurrentUser();
    }
  }

  /* ==========================================================================
   * Clear current user
   * ======================================================================== */

  private clearCurrentUser(): void {
    if (this.currentUser === null) {
      return;
    }

    this.currentUser = null;

    this.notify();
  }

  /* ==========================================================================
   * Notify subscribers
   * ======================================================================== */

  private notify(): void {
    const user = this.currentUser;

    this.listeners.forEach((listener) => {
      try {
        listener(user);
      } catch (error) {
        /**
         * A broken UI subscriber must never break authentication state.
         */
        console.error("[AuthService] Authentication listener failed:", error);
      }
    });
  }
}

/* ============================================================================
 * Singleton
 * ========================================================================== */

export const authService = new AuthService();
