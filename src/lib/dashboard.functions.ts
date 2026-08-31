import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CountSchema = z.number().int().nonnegative();
const NamedCountSchema = z
  .object({ name: z.string().trim().min(1).max(160), value: CountSchema })
  .strict();

const DashboardOverviewSchema = z
  .object({
    kpis: z
      .object({
        teamMembers: CountSchema,
        openRequirements: CountSchema,
        submissionsThisWeek: CountSchema,
        submissionsPrevWeek: CountSchema,
        interviewsScheduled: CountSchema,
        activeConsultants: CountSchema,
        benchReady: CountSchema,
        activePlacements: CountSchema,
        hiresThisMonth: CountSchema,
      })
      .strict(),
    trend: z
      .array(
        z
          .object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            label: z.string().trim().min(1).max(16),
            submissions: CountSchema,
            hired: CountSchema,
          })
          .strict(),
      )
      .length(14),
    funnel: z
      .array(
        z
          .object({
            stage: z.enum([
              "draft",
              "submitted",
              "vendor_review",
              "client_review",
              "interview",
              "offer",
              "hired",
              "rejected",
              "withdrawn",
            ]),
            count: CountSchema,
          })
          .strict(),
      )
      .length(9),
    recruiters: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().trim().min(1).max(255),
            email: z.string().email().max(255),
            avatar_url: z.string().max(2_000).nullable(),
            submissions: CountSchema,
            hires: CountSchema,
          })
          .strict(),
      )
      .max(5),
    bench: z
      .object({
        total: CountSchema,
        immediate: CountSchema,
        by_availability: z
          .array(
            z
              .object({
                name: z.enum(["immediate", "two_weeks", "one_month", "negotiable", "unavailable"]),
                value: CountSchema,
              })
              .strict(),
          )
          .length(5),
        by_visa: z.array(NamedCountSchema).max(100),
        top_tech: z.array(NamedCountSchema).max(8),
      })
      .strict(),
    requirements: z
      .object({
        by_status: z
          .array(
            z
              .object({
                name: z.enum(["open", "closed", "expired"]),
                value: CountSchema,
              })
              .strict(),
          )
          .length(3),
        by_priority: z
          .array(
            z
              .object({
                name: z.enum(["low", "medium", "high", "urgent"]),
                value: CountSchema,
              })
              .strict(),
          )
          .length(4),
      })
      .strict(),
  })
  .strict();

export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;

/**
 * All dashboard aggregates are computed by PostgreSQL and returned by one
 * tenant-scoped RPC. No business rows are transferred to Node for counting.
 */
export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("dashboard_overview");
    if (error) throw new Error(`Unable to load dashboard overview: ${error.message}`);
    if (!data) throw new Error("Dashboard overview is unavailable for this user");
    return DashboardOverviewSchema.parse(data);
  });

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, actor_email, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw new Error(`Unable to load recent activity: ${error.message}`);
    return data ?? [];
  });
