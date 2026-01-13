import type { Client } from "@opensearch-project/opensearch";

export async function ensureIngredientIndex(os: Client, indexName: string) {
  const exists = await os.indices.exists({ index: indexName });
  if (exists.body === true) return;

  await os.indices.create({
    index: indexName,
    body: {
      settings: {
        index: { number_of_shards: 1, number_of_replicas: 0 }
      },
      mappings: {
        properties: {
          tenant_id: { type: "keyword" },
          id: { type: "keyword" },
          name: { type: "text" },
          internal_code: { type: "keyword" },
          synonyms: { type: "text" },
          tags: { type: "keyword" },
          updated_at: { type: "date" }
        }
      }
    }
  });
}
