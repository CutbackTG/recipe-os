import type { FastifyInstance } from "fastify";
import { LineItemsBulkSchema, ComputeDraftSchema } from "@hg2/shared";

type DraftParams = { id: string };
type DraftRoute = { Params: DraftParams };

export async function draftRoutes(app: FastifyInstance) {
  // Bulk upsert line items for a draft
  app.patch<DraftRoute>(
    "/drafts/:id/line-items",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const draftId = req.params.id;

      const parsed = LineItemsBulkSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

      const { tenant_id, items } = parsed.data;

      const client = await app.db.connect();
      try {
        await client.query("begin");

        for (const it of items) {
          await client.query(
            `insert into recipe_line_item (tenant_id, draft_id, ingredient_id, pct, note)
             values ($1, $2::uuid, $3::uuid, $4, $5)
             on conflict (draft_id, ingredient_id)
             do update set
               pct = excluded.pct,
               note = excluded.note,
               updated_at = now()`,
            [tenant_id, draftId, it.ingredient_id, it.pct, it.note ?? null]
          );
        }

        await client.query("commit");
        return reply.send({ ok: true });
      } catch (e) {
        await client.query("rollback");
        throw e;
      } finally {
        client.release();
      }
    }
  );

  // Compute rollups (cost/kg + protein/sugar per 100g)
  app.post<DraftRoute>(
    "/drafts/:id/compute",
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const draftId = req.params.id;

      const parsed = ComputeDraftSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

      const { tenant_id } = parsed.data;

      // cache key for fast UI refresh
      const cacheKey = `draft:rollup:${tenant_id}:${draftId}`;
      const cached = await app.redis.get(cacheKey);
      if (cached) return reply.send(JSON.parse(cached));

      // Pull line items + ingredient nutrient/cost
      const r = await app.db.query(
        `select
           li.pct,
           i.cost_per_kg,
           i.protein_g_per_100g,
           i.sugar_g_per_100g
         from recipe_line_item li
         join ingredient i on i.id = li.ingredient_id
         where li.draft_id = $1::uuid and li.tenant_id = $2`,
        [draftId, tenant_id]
      );

      const rows = r.rows as Array<{
        pct: string;
        cost_per_kg: string | null;
        protein_g_per_100g: string | null;
        sugar_g_per_100g: string | null;
      }>;

      // Compute: treat pct as “g per 100g of product”
      // cost/kg = sum( (pct/100) * cost_per_kg )
      // nutrients per 100g = sum( (pct/100) * nutrient_per_100g )
      let costPerKg = 0;
      let proteinPer100g = 0;
      let sugarPer100g = 0;
      let pctTotal = 0;

      for (const row of rows) {
        const pct = Number(row.pct);
        const w = pct / 100;
        pctTotal += pct;

        costPerKg += w * Number(row.cost_per_kg ?? 0);
        proteinPer100g += w * Number(row.protein_g_per_100g ?? 0);
        sugarPer100g += w * Number(row.sugar_g_per_100g ?? 0);
      }

      const payload = {
        draft_id: draftId,
        tenant_id,
        pct_total: Number(pctTotal.toFixed(6)),
        cost_per_kg: Number(costPerKg.toFixed(6)),
        protein_g_per_100g: Number(proteinPer100g.toFixed(6)),
        sugar_g_per_100g: Number(sugarPer100g.toFixed(6))
      };

      // tiny TTL for “live” feel
      await app.redis.setEx(cacheKey, 5, JSON.stringify(payload));

      return reply.send(payload);
    }
  );
}
