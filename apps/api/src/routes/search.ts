import type { FastifyInstance } from "fastify";
import { SearchQuerySchema } from "@hg2/shared/src/zod.js";

export async function searchRoutes(app: FastifyInstance) {
  app.get("/search", async (req, reply) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const { q, tenant_id, site_id, types } = parsed.data;

    const cacheKey = `search:${tenant_id}:${site_id}:${types.join("|")}:${q.toLowerCase()}`;
    const cached = await app.redis.get(cacheKey);
    if (cached) return reply.send(JSON.parse(cached));

    const results: any[] = [];

    if (types.includes("ingredient")) {
      const idx = process.env.OPENSEARCH_INDEX_INGREDIENTS ?? "ingredients_v1";
      const r = await app.os.search({
        index: idx,
        size: 20,
        query: {
          bool: {
            filter: [
              { term: { tenant_id } }
            ],
            should: [
              { match: { name: { query: q, boost: 4, fuzziness: "AUTO" } } },
              { match: { synonyms: { query: q, boost: 2, fuzziness: "AUTO" } } },
              { match: { internal_code: { query: q, boost: 3 } } },
              { match: { tags: { query: q, boost: 1 } } }
            ],
            minimum_should_match: 1
          }
        }
      });

      const hits = (r.hits.hits ?? []).map((h: any) => ({
        type: "ingredient",
        score: h._score,
        ...h._source
      }));
      results.push(...hits);
    }

    // recipes index later; keep shape ready
    // if (types.includes("recipe")) { ... }

    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const payload = { q, tenant_id, site_id, results };
    await app.redis.setEx(cacheKey, 10, JSON.stringify(payload)); // tiny TTL for hot typing
    return reply.send(payload);
  });
}
