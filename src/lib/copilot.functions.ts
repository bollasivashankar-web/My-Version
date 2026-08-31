import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  requestStructuredAiOutput,
  UNTRUSTED_DOCUMENT_SYSTEM_RULES,
} from "@/lib/ai-gateway.server";
import { writeAudit } from "@/lib/audit.server";

const COPILOT_MODEL = "google/gemini-3-flash-preview";
const COPILOT_PROMPT_VERSION = "copilot-readonly-v1";

const CopilotRequestSchema = z.object({
  question: z.string().trim().min(1).max(2_000),
});

const CopilotResponseSchema = z
  .object({
    answer: z.string().trim().min(1).max(6_000),
  })
  .strict();

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CopilotRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [requirementsResult, candidatesResult, submissionsResult] = await Promise.all([
      context.supabase
        .from("requirements")
        .select("id, title, status, priority, primary_technology, location, work_mode")
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("candidates")
        .select(
          "id, first_name, last_name, current_title, primary_technology, location, visa_status, availability, experience_years, status",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("submissions")
        .select("id, candidate_id, requirement_id, stage, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const databaseError = [
      requirementsResult.error,
      candidatesResult.error,
      submissionsResult.error,
    ].find(Boolean);
    if (databaseError) throw new Error("Unable to load Copilot context.");

    const contextSnapshot = {
      requirements: requirementsResult.data ?? [],
      candidates: candidatesResult.data ?? [],
      submissions: submissionsResult.data ?? [],
    };

    const response = await requestStructuredAiOutput(
      {
        model: COPILOT_MODEL,
        temperature: 0.2,
        max_completion_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${UNTRUSTED_DOCUMENT_SYSTEM_RULES}
You are the read-only Staffinix recruiting operations assistant.
Answer only from the supplied tenant-scoped context. If the context is insufficient, say so.
Never claim to perform writes, send messages, change stages, approve access, or contact people.
Never make or recommend automatic hiring/rejection decisions. Present factual comparisons for human review.
Return JSON with exactly one string field named answer.`,
          },
          {
            role: "user",
            content: `<user_request>${data.question}</user_request>\n<untrusted_context>${JSON.stringify(contextSnapshot)}</untrusted_context>`,
          },
        ],
      },
      CopilotResponseSchema,
    );

    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims.email as string | undefined) ?? null,
      action: "copilot.answer_generated",
      entityType: "copilot",
      metadata: {
        model: COPILOT_MODEL,
        prompt_version: COPILOT_PROMPT_VERSION,
        requirement_count: contextSnapshot.requirements.length,
        candidate_count: contextSnapshot.candidates.length,
        submission_count: contextSnapshot.submissions.length,
      },
    });

    return response;
  });
