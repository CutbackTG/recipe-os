import type { FastifyInstance, FastifyRequest } from "fastify";
import { SearchQuerySchema } from "@hg2/shared";

/**
 * GET /search?q=...&tenant_id=...&site_id=...&types=ingredient,recipe
 *
 * Notes:
 * - We use OpenSearch for ingredient search.
 * - We deliberately cast the OpenSearch client to `any` to avoid TS overload issues
 *   in the OpenSearch JS client typings (we can tighten later).
 * - Redis cache TTL is short to keep "typeahead" fast.
 */
export async function searchRoutes(app: FastifyInstance) {
  app.get(
    "/search",
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

      // ---------- INGREDIENT SEARCH ----------
      if ((types ?? []).includes("ingredient")) {
        const idx = process.env.OPENSEARCH_INDEX_INGREDIENTS ?? "ingredients_v1";

        const os: any = app.os; // bypass OpenSearch typings quirks
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

      // ---------- RECIPE SEARCH (stub for now) ----------
      // We'll add recipes_v1 later and merge results here.
      // if ((types ?? []).includes("recipe")) { ... }

      // Sort mixed results by score desc
      results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      const payload = { q, tenant_id, site_id, results };

      // Short TTL so the typeahead stays fresh
      await app.redis.setEx(cacheKey, 10, JSON.stringify(payload));

      return reply.send(payload);
    }
  );
}
