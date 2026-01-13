import pg from "pg";
import { Client as OSClient } from "@opensearch-project/opensearch";
import { ensureIngredientIndex } from "./lib/indexers.js";

type OutboxEventRow = {
  id: string;
  tenant_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: any; // JSONB
  created_at: string; // timestamptz
  processed_at: string | null; // timestamptz
};

const databaseUrl = process.env.DATABASE_URL!;
const osUrl = process.env.OPENSEARCH_URL!;
const ingredientIndex =
  process.env.OPENSEARCH_INDEX_INGREDIENTS ?? "ingredients_v1";

if (!databaseUrl) throw new Error("DATABASE_URL missing");
if (!osUrl) throw new Error("OPENSEARCH_URL missing");

const pool = new pg.Pool({ connectionString: databaseUrl });
const os = new OSClient({ node: osUrl });

await ensureIngredientIndex(os, ingredientIndex);

/**
 * Fetch unprocessed events from the real table: outbox_event
 */
async function fetchUnprocessed(
  pool: pg.Pool,
  batchSize: number
): Promise<OutboxEventRow[]> {
  const res = await pool.query<OutboxEventRow>(
    `
    select
      id,
      tenant_id,
      event_type,
      aggregate_type,
      aggregate_id,
      payload,
      created_at,
      processed_at
    from outbox_event
    where processed_at is null
    order by created_at asc
    limit $1
    `,
    [batchSize]
  );

  return res.rows;
}

/**
 * Mark a batch of events processed (once successfully handled).
 */
async function markProcessed(pool: pg.Pool, ids: string[]) {
  if (ids.length === 0) return;

  await pool.query(
    `
    update outbox_event
    set processed_at = now()
    where id = any($1::uuid[])
    `,
    [ids]
  );
}

async function loop() {
  const events = await fetchUnprocessed(pool, 200);
  if (events.length === 0) return;

  const processedIds: string[] = [];

  for (const ev of events) {
    try {
      if (ev.event_type === "ingredient.upserted") {
        const doc = ev.payload;

        await os.index({
          index: ingredientIndex,
          id: doc.id,
          body: doc,
          refresh: false,
        });

        processedIds.push(ev.id);
      } else {
        // Unknown events: mark processed for now (later: DLQ)
        processedIds.push(ev.id);
      }
    } catch (e) {
      // Don’t mark this event as processed if indexing failed.
      console.error("failed processing event", { id: ev.id, type: ev.event_type }, e);
    }
  }

  // Refresh so searches see recent writes quickly (can relax later for throughput)
  await os.indices.refresh({ index: ingredientIndex });

  // Mark only successfully processed events
  await markProcessed(pool, processedIds);
}

const interval = setInterval(() => {
  loop().catch((e) => console.error("worker loop error", e));
}, 500);

console.log("👷 worker running: outbox_event → opensearch");

// Graceful shutdown (nice for dev restarts)
async function shutdown() {
  clearInterval(interval);
  try {
    await pool.end();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
