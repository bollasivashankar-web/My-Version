import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: rolesData, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error(rolesErr.message);

    return {
      profile,
      roles: (rolesData ?? []).map((r) => r.role),
      email: (claims.email as string | undefined) ?? profile?.email ?? null,
      userId,
    };
  });

const UpdateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => UpdateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        ...(data.full_name !== undefined ? { full_name: data.full_name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.avatar_url !== undefined ? { avatar_url: data.avatar_url } : {}),
      })
      .eq("id", userId)
      .select("id, full_name, email, phone, avatar_url")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit({
      actorId: userId,
      actorEmail: (claims.email as string | undefined) ?? null,
      action: "profile.updated",
      entityType: "profile",
      entityId: userId,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  });
