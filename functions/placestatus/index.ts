import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { getSource, writeResult } from "./db";
import { checkSource, logSource, runDue, type CheckDeps } from "./executor";
import { createFetcher } from "./fetchPage";
import { testBodySchema, triggerEnvelopeSchema } from "./schema";
import { createAiClient } from "./strategies/ai";

const MANUAL_AI_CALLS = 2;

const digest = (value: string) => createHash("sha256").update(value).digest();

const admin: MiddlewareHandler = async (c, next) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return c.notFound();
  const given = c.req.header("Authorization") ?? "";
  // Hashed first: timingSafeEqual needs equal lengths.
  if (!timingSafeEqual(digest(given), digest(`Bearer ${token}`))) return c.json({ error: "unauthorized" }, 401);
  await next();
};

function manualDeps(): CheckDeps {
  let aiLeft = MANUAL_AI_CALLS;
  return { fetch: createFetcher(), ai: createAiClient(), takeAiCall: () => aiLeft-- > 0, now: new Date() };
}

const app = new Hono();

app.get("/health", (c) => c.text("ok"));

app.post("/run", async (c) => {
  // Neon strips client-sent X-Neon-* headers, so its presence proves the call is a trigger.
  if (!c.req.header("X-Neon-Trigger-Invocation-Id")) return c.json({ error: "forbidden" }, 403);
  const envelope = triggerEnvelopeSchema.safeParse(await c.req.json().catch(() => null));
  if (!envelope.success) return c.json({ error: "invalid trigger envelope" }, 400);

  const { invocation_id: invocationId, data } = envelope.data;
  console.log(`run start ${invocationId} ${data.scheduled_at}`);
  const summary = await runDue(invocationId);
  console.log(`run end ${JSON.stringify(summary)}`);
  return c.json(summary);
});

app.post("/check/:sourceId", admin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("sourceId"));
  const source = id.success ? await getSource(id.data) : null;
  if (!source) return c.json({ error: "source not found" }, 404);

  const invocationId = `manual-${randomUUID()}`;
  const result = await checkSource(source, manualDeps());
  await writeResult(source.id, invocationId, result);
  logSource(invocationId, source, result);
  return c.json({ invocationId, ...result });
});

app.post("/test", admin, async (c) => {
  const body = testBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: z.prettifyError(body.error) }, 400);

  const result = await checkSource(
    {
      id: "test",
      url: body.data.url,
      config: body.data.config,
      place_name: body.data.placeName ?? "unknown",
      last_status: "unknown",
      last_confidence: null,
      last_evidence: null,
      last_content_hash: null,
      last_etag: null,
      last_modified: null,
      last_ai_at: null,
    },
    manualDeps(),
  );
  return c.json(result);
});

export default app;
