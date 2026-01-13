import type { FastifyInstance } from "fastify";
import { SearchQuerySchema } from "@hg2/shared";

/**
 * GET /search?q=...&tenant_id=...&site_id=...&types=ingredient,recipe
 *
 * Requires auth (Okta in prod, bypass in dev if AUTH_MODE=none).
 * Uses Redis for short-lived caching.
 * Uses OpenSearch for ingredient search (recipes can be added later).
 */
export async function searchRoutes(app: FastifyInstance) {
  app.get(
    "/search",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const parsed = SearchQuerySchema.safeParse(req.query);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

      const { q, tenant_id, site_id, types } = parsed.data;

      const normQ = q.trim().toLowerCase();
      const normTypes = (types ?? ["ingredient", "recipe"]).join("|");

      const cacheKey = `search:${tenant_id}:${site_id}:${normTypes}:${normQ}`;

      // Cache (redis shim exists even if Redis disabled)
      const cached = await app.redis.get(cacheKey);
      if (cached) return reply.send(JSON.parse(cached));

      // OpenSearch may be disabled/unavailable in local dev
      if (!app.os) {
        return reply.code(503).send({ error: "opensearch unavailable" });
      }

      const results: any[] = [];

      // Ingredients
      const want = new Set(types ?? ["ingredient", "recipe"]);
      if (want.has("ingredient")) {
        const idx = process.env.OPENSEARCH_INDEX_INGREDIENTS ?? "ingredients_v1";
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

        // Different client versions return different shapes; support both
        const hitsRaw = r?.body?.hits?.hits ?? r?.hits?.hits ?? [];

        results.push(
          ...hitsRaw.map((h: any) => ({
            type: "ingredient",
            score: h?._score ?? 0,
            ...h?._source
          }))
        );
      }

      // Recipes: add later (recipes_v1 index + mapping)
      // if (want.has("recipe")) { ... }

      results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      const payload = { q, tenant_id, site_id, results };

      // Short TTL for typeahead feel
      await app.redis.setEx(cacheKey, 10, JSON.stringify(payload));

      return reply.send(payload);
    }
  );
}
