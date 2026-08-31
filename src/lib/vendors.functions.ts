import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STATUSES = ["prospect", "active", "inactive"] as const;
const TIERS = ["a", "b", "c"] as const;

const VENDOR_LIST_FIELDS =
  "id, name, status, tier, contact_name, contact_email, contact_phone, city, state, country, payment_terms_days, created_at";
const VENDOR_DETAIL_FIELDS =
  "id, name, status, tier, contact_name, contact_email, contact_phone, website, address, city, state, country, postal_code, tax_id, payment_terms_days, msa_signed_at, notes";

const VendorInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  status: z.enum(STATUSES).default("active"),
  tier: z.enum(TIERS).nullable().optional(),
  contact_name: z.string().trim().max(120).nullable().optional(),
  contact_email: z
    .string()
    .trim()
    .email()
    .max(255)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  contact_phone: z.string().trim().max(40).nullable().optional(),
  website: z.string().trim().max(255).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  postal_code: z.string().trim().max(24).nullable().optional(),
  tax_id: z.string().trim().max(60).nullable().optional(),
  payment_terms_days: z.number().int().min(0).max(365).nullable().optional(),
  msa_signed_at: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const ListSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum([...STATUSES, "all"]).optional(),
  tier: z.enum([...TIERS, "all"]).optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(20),
});

export const listVendors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    let q = context.supabase
      .from("vendors")
      .select(VENDOR_LIST_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.tier && data.tier !== "all") q = q.eq("tier", data.tier);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(`Failed to load vendors: ${error.message}`);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const listVendorsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vendors")
      .select("id, name, status")
      .order("name");
    if (error) throw new Error(`Failed to load vendors: ${error.message}`);
    return data ?? [];
  });

export const getVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select(VENDOR_DETAIL_FIELDS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load vendor: ${error.message}`);
    if (!vendor) throw new Error("Vendor not found or access denied");

    const [reqs, subs] = await Promise.all([
      context.supabase
        .from("requirements")
        .select("id, title, status, created_at")
        .eq("vendor_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("submissions")
        .select("id, stage, created_at, candidate_id, requirement_id")
        .eq("vendor_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (reqs.error) throw new Error(`Failed to load vendor requirements: ${reqs.error.message}`);
    if (subs.error) throw new Error(`Failed to load vendor submissions: ${subs.error.message}`);

    return { vendor, requirements: reqs.data ?? [], submissions: subs.data ?? [] };
  });

export const createVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => VendorInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    const { data: row, error } = await context.supabase
      .from("vendors")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`Failed to create vendor: ${error.message}`);
    return row;
  });

export const updateVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: VendorInputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vendors")
      .update(data.patch)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Failed to update vendor: ${error.message}`);
    if (!row) throw new Error("Vendor not found or access denied");
    return row;
  });

export const deleteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vendors")
      .delete()
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Failed to delete vendor: ${error.message}`);
    if (!row) throw new Error("Vendor not found or access denied");
    return { ok: true };
  });
