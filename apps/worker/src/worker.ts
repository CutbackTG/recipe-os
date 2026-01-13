import pg from "pg";
import { Client as OSClient } from "@opensearch-project/opensearch";
import { fetchUnprocessed, markProcessed } from "./lib/outbox.js";
import { ensureIngredientIndex } from "./lib/indexers.js";

const databaseUrl = process.env.DATABASE_URL!;
const osUrl = process.env.OPENSEARCH_URL!;
const ingredientIndex = process.env.OPENSEARCH_INDEX_INGREDIENTS ?? "ingredients_v1";

const pool = new pg.Pool({ connectionString: databaseUrl });
const os = new OSClient({ node: osUrl });

await ensureIngredientIndex(os, ingredientIndex);

async function loop() {
  const events = await fetchUnprocessed(pool, 200);
  if (events.length === 0) return;

  const processedIds: string[] = [];

  for (const ev of events) {
    if (ev.event_type === "ingredient.upserted") {
      const doc = ev.payload;
      await os.index({
        index: ingredientIndex,
        id: doc.id,
        body: doc,
        refresh: false
      });
      processedIds.push(ev.id);
    } else {
      processedIds.push(ev.id); // unknown events: mark processed (or park in DLQ later)
    }
  }

  await os.indices.refresh({ index: ingredientIndex });
  await markProcessed(pool, processedIds);
}

setInterval(() => {
  loop().catch((e) => console.error("worker loop error", e));
}, 500);

console.log("👷 worker running: outbox → opensearch");
