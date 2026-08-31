import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  APP_ROLES,
  assertAdmin,
  assertSuperAdmin,
  type AppRole,
  type AuthorizationSnapshot,
} from "@/lib/authorization-policy";

export type { AppRole } from "@/lib/authorization-policy";

const VALID_ROLES = new Set<AppRole>(APP_ROLES);

export async function getUserRoles(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AppRole[]> {
  if (!userId) return [];

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile?.is_active) return [];

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  if (error) {
    console.error("[RBAC] Failed to load roles:", error.message);
    // Never turn an authorization lookup failure into elevated access.
    return [];
  }

  return (data ?? []).map((row) => row.role as AppRole).filter((role) => VALID_ROLES.has(role));
}

export function isAdminRole(roles: AppRole[]): boolean {
  return roles.some((role) => role === "admin" || role === "super_admin");
}

export function isSuperAdmin(roles: AppRole[]): boolean {
  return roles.includes("super_admin");
}

export async function requireAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AppRole[]> {
  const roles = await getUserRoles(supabase, userId);
  const snapshot: AuthorizationSnapshot = {
    active: roles.length > 0,
    roles,
    tenantId: null,
    platformRole: null,
  };
  assertAdmin(snapshot);
  return roles;
}

export async function requireSuperAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AppRole[]> {
  const roles = await getUserRoles(supabase, userId);
  const snapshot: AuthorizationSnapshot = {
    active: roles.length > 0,
    roles,
    tenantId: null,
    platformRole: null,
  };
  assertSuperAdmin(snapshot);
  return roles;
}
