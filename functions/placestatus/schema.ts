import { z } from "zod";

export const statusSchema = z.enum(["open", "closed", "unknown"]);
export type Status = z.infer<typeof statusSchema>;

const decidedSchema = z.enum(["open", "closed"]);

const matchSchema = z.object({
  open: z.array(z.string()).default([]),
  closed: z.array(z.string()).default([]),
});
export type Match = z.infer<typeof matchSchema>;

const ruleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("selector"),
    selector: z.string().min(1),
    attribute: z.string().optional(),
    match: matchSchema,
    required: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("regex"),
    pattern: z.string().min(1),
    flags: z.string().default("i"),
    scope: z.string().optional(),
    status: decidedSchema,
  }),
  z.object({
    type: z.literal("json"),
    url: z.url().optional(),
    path: z.string().min(1),
    map: z.record(z.string(), decidedSchema),
  }),
]);
export type Rule = z.infer<typeof ruleSchema>;

export const sourceConfigSchema = z.object({
  version: z.literal(1),
  fetch: z
    .object({
      headers: z.record(z.string(), z.string()).default({}),
      timeoutMs: z.number().int().positive().default(10_000),
      maxBytes: z.number().int().positive().default(2_000_000),
    })
    .prefault({}),
  scope: z.string().optional(),
  rules: z.array(ruleSchema),
  ai: z.object({
    mode: z.enum(["fallback", "always", "never"]).default("fallback"),
    hint: z.string().optional(),
    model: z.string().optional(),
    minConfidence: z.number().min(0).max(1).default(0.7),
  }),
});
export type SourceConfig = z.infer<typeof sourceConfigSchema>;

export const triggerEnvelopeSchema = z.object({
  invocation_id: z.string().min(1),
  trigger: z.object({ name: z.string() }),
  data: z.object({ scheduled_at: z.string() }),
});

export const aiOutputSchema = z.object({
  status: statusSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  reopens_at: z.string().nullish(),
});
export type AiOutput = z.infer<typeof aiOutputSchema>;

export const testBodySchema = z.object({
  url: z.url(),
  config: z.unknown(),
  placeName: z.string().optional(),
});
