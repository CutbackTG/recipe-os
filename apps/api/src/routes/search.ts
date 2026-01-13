import type { FastifyInstance, FastifyRequest } from "fastify";
import { SearchQuerySchema } from "@hg2/shared";

/**
 * GET /search?q=...&tenant_id=...&site_id=...&types=ingredient,recipe
 *
 * Protected endpoint (Okta session cookie). Requires user to be logged in.
 * Uses Redis for a short-lived cache to keep typeahead snappy.
 * Uses OpenSearch for ingredient search (recipes will be added later).
 */
export async function searchRoutes(app: FastifyInstance) {
  app.get(
    "/search",
    { preHandler: app.requireAuth },
    async (req: FastifyRequest, reply) => {
      const parsed = SearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send(parsed.error.flatten());
      }

      const { q, tenant_id, site_id, types } = parsed.data;

      const normQ = q.trim().toLowerCase();
      const normTypes = (types ?? ["ingredient", "recipe"]).join("|");

      const cacheKey = `search:${tenant_id}:${site_id}:${normTypes}:${normQ}`;
      const cached = await app.redis.get(cacheKey);
      if (cached) {
        return reply.send(JSON.parse(cached));
      }

      const results: any[] = [];

      // --- Ingredients (OpenSearch) ---
      if ((types ?? []).includes("ingredient")) {
        const idx = process.env.OPENSEARCH_INDEX_INGREDIENTS ?? "ingredients_v1";

        // OpenSearch JS client typings can be awkward; use a local any cast for now.
        const os: any = app.os;

        const r = await os.search({
          index: idx,
          body: {
            size: 20,
            query: {
              bool: {
                filter: [{ term: { tenant_id } }],
                should: [
                  { match: { name: { query: q, boost: 4, fuzziness: "AUTO" } } },
                  { match: { synonyms: { query: q, boost: 2, fuzziness: "AUTO" } } },
                  { match: { internal_code: { query: q, boost: 3 } } },
                  { match: { tags: { query: q, boost: 1 } } }
                ],
                minimum_should_match: 1
              }
            }
          }
        });

        const hitsRaw = r?.body?.hits?.hits ?? r?.hits?.hits ?? [];

        const hits = hitsRaw.map((h: any) => ({
          type: "ingredient",
          score: h?._score ?? 0,
          ...h?._source
        }));

        results.push(...hits);
      }

      // --- Recipes (stub for later) ---
      // We'll add recipes_v1 index and merge results here.
      // if ((types ?? []).includes("recipe")) { ... }

      // Sort mixed results by score desc (works for future multi-type search)
      results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      const payload = { q, tenant_id, site_id, results };

      // Short TTL so results stay fresh while typing
      await app.redis.setEx(cacheKey, 10, JSON.stringify(payload));

      return reply.send(payload);
    }
  );
}
