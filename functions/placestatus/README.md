# placestatus

Neon Function that decides whether each place is `open`, `closed` or `unknown` by reading a public web page. How a place is scraped is data: one row per source in `place_status_source`, with the rules in its `config` JSON column. Every check is logged in `place_status_check`.

A Neon schedule trigger (`placestatus-schedule`, declared in `/neon.ts`) calls `POST /run` every 2 hours between 04:00 and 20:00 UTC. Each run claims the sources whose `next_check_at` has passed, checks them, and writes one log row and one state update per source.

## Routes

| Route | Auth | Effect |
| --- | --- | --- |
| `GET /health` | none | `200 ok`, no database access |
| `POST /run` | `X-Neon-Trigger-Invocation-Id` header, else `403` | Runs every due source, returns the run summary |
| `POST /check/:sourceId` | `Authorization: Bearer $ADMIN_TOKEN` | Checks one source now and writes the result |
| `POST /test` | `Authorization: Bearer $ADMIN_TOKEN` | Tries a config against a URL. Writes nothing |

With `ADMIN_TOKEN` empty, `/check` and `/test` return `404`.

## Environment variables

Values in `neon.ts` are captured when `neon deploy` runs, not at runtime. Changing one means redeploying.

| Function variable | Set from (deploy shell) | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | injected by Neon | | Pooled connection of the branch. Do not set it yourself |
| `ADMIN_TOKEN` | `PLACESTATUS_ADMIN_TOKEN` | empty | Bearer token for `/check` and `/test` |
| `AI_BASE_URL` | `AI_BASE_URL` | Gemini's OpenAI-compatible endpoint | Any OpenAI-compatible API |
| `AI_API_KEY` | `GEMINI_API_KEY` | empty | Without a key, the AI fallback is off (`last_error = 'ai not configured'`) |
| `AI_MODEL` | `GEMINI_MODEL` | `gemini-3.6-flash` | Default model; `config.ai.model` overrides it per source |
| `MAX_SOURCES_PER_RUN` | | `50` | Sources claimed per run |
| `CONCURRENCY` | | `4` | Sources checked in parallel |
| `AI_MAX_CALLS_PER_RUN` | | `20` | LLM requests per run |
| `AI_MAX_CALLS_PER_DAY` | | `100` | LLM checks per UTC day, counted in `place_status_check` |
| `BOT_CONTACT_URL` | `NEXT_PUBLIC_SITE_URL` | empty | Contact URL in the bot's `User-Agent` |

If `NEON_AI_GATEWAY_TOKEN` and `NEON_AI_GATEWAY_BASE_URL` are present (`aiGateway: true` in `neon.ts`), the function uses the Neon AI Gateway instead of `AI_BASE_URL` / `AI_API_KEY`.

## The config

```json
{
  "version": 1,
  "scope": "main",
  "rules": [
    { "type": "selector", "selector": ".alert-banner", "match": { "closed": ["fermé", "accès interdit"], "open": ["ouvert"] } },
    { "type": "regex", "pattern": "ferm[ée]e? jusqu'au", "status": "closed" },
    { "type": "json", "url": "https://example.org/api/status", "path": "data.status", "map": { "OPEN": "open", "CLOSED": "closed" } }
  ],
  "ai": { "mode": "fallback", "hint": "Closures are announced in the yellow banner. Ignore the opening hours table." }
}
```

Rules run in order and the first one that returns `open` or `closed` decides. If none does, the LLM reads the page text, as allowed by `ai.mode`:

- `fallback` (default): the LLM runs only when no rule decides.
- `always`: rules are skipped.
- `never`: no LLM call; an undecided page is `unknown`.

Rule types:

- `selector`: text (or `attribute`) of the first element matching a CSS selector. `match.closed` is checked before `match.open`. A keyword is a case- and accent-insensitive substring, or a `/regex/` string tested against the lowercased, accent-folded text (so write `/ferme/`, not `/fermé/`). A missing element gives `unknown`, or an error with `required: true`.
- `regex`: `pattern` tested against the visible text of `scope` (the rule's, else the config's, else the page body without `nav`, `header` and `footer`). `flags` defaults to `i`. The text keeps its accents and case.
- `json`: fetches `url` (default: the source URL), reads the dot path, and looks the value up in `map`.

`fetch.timeoutMs` (10000), `fetch.maxBytes` (2000000), `fetch.headers` and `ai.minConfidence` (0.7) are optional.

A source with `"rules": []` works with no further setup: the LLM decides.

## Author a rule with /test

`/test` runs the same code as a real check and returns the decision, the result of every rule, the first 500 characters of the text the rules and the LLM see, and the LLM's raw answer. It writes nothing, and it is not counted in the daily AI budget.

```bash
curl -s -X POST "$FUNCTION_URL/test" \
  -H "Authorization: Bearer $PLACESTATUS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.org/acces",
    "placeName": "Calanque du Mugel",
    "config": {
      "version": 1,
      "rules": [{ "type": "regex", "pattern": "acc[èe]s interdit", "status": "closed" }],
      "ai": { "mode": "never" }
    }
  }'
```

1. Start with `"ai": { "mode": "never" }` and read `textExcerpt` and `rules` in the response until the rule decides on today's page.
2. Set `ai.mode` back to `fallback` so the LLM covers the day the page layout changes.
3. Save the config, then check the source once for real:

```sql
UPDATE place_status_source SET config = '<the JSON>'::jsonb, next_check_at = now() WHERE id = '<source id>';
```

```bash
curl -s -X POST "$FUNCTION_URL/check/<source id>" -H "Authorization: Bearer $PLACESTATUS_ADMIN_TOKEN"
```

A config change applies on the next check, with no redeploy. One exception: for a source the LLM decides, an unchanged page is not sent to the LLM again for 24 hours, so a new `ai.hint` can take up to a day to show.

## How a result is stored

- Decided, or honestly undecided: `last_*` columns updated, `consecutive_failures = 0`, next check after `check_interval_minutes`.
- Fetch error, or a rule or LLM error with no decision: `last_status` is kept while the last successful check (`last_checked_at`) is under 48 hours old, then becomes `unknown`. `consecutive_failures` goes up and the next check backs off to `check_interval_minutes × 2^failures`, capped at 24 hours.
- AI budget spent: `unknown` with `last_error = 'ai budget'`, and the source stays due for the next run.
- `robots.txt` disallows the page: `unknown` with `last_error = 'robots.txt disallow'`, no fetch.

`place_status_check.method` is the rule type, `ai`, `unchanged` (same page text as the last LLM answer, under 24 hours old) or `none` (nothing decided).

## Dev loop

```bash
neon link          # once: link the repo to the Neon project
neon dev           # serves the function on http://localhost:8787 with the branch env
```

Seed a few sources (`pnpm status:seed`), then replay a trigger. The header is what makes `/run` accept the call:

```bash
curl -X POST http://localhost:8787/run \
  -H "Content-Type: application/json" \
  -H "X-Neon-Trigger-Invocation-Id: local-test" \
  -d '{"version":1,"invocation_id":"local-1","trigger":{"type":"schedule","id":"trigger-local","name":"placestatus-schedule"},"data":{"scheduled_at":"2026-10-10T08:00:00Z"}}'
```

A source is claimed only when `next_check_at <= now()`. To run the same sources again, reset it: `UPDATE place_status_source SET next_check_at = now(), lease_until = NULL;`

## Deploy

1. Put `GEMINI_API_KEY`, `GEMINI_MODEL`, `PLACESTATUS_ADMIN_TOKEN` and `NEXT_PUBLIC_SITE_URL` (the production URL) in `.env.production`.
2. Apply the Prisma migration that creates `place_status_source` and `place_status_check`.
3. `neon deploy --env .env.production`
4. Check one real scheduled run: set `cron` in `neon.ts` to `* * * * *`, deploy, and watch `neon logs query --source function` for a `run start` and a `run end` line.
5. Set `cron` back to `0 4-20/2 * * *` and deploy again.

The function slug `placestatus` cannot change after the first deploy. On a child branch the trigger is inherited disabled, so preview branches do not scrape.
