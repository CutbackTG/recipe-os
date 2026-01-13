import type { FastifyInstance } from "fastify";
import { IngredientCreateSchema } from "@hg2/shared/src/zod.js";

export async function ingredientRoutes(app: FastifyInstance) {
  app.post("/ingredients", async (req, reply) => {
    const parsed = IngredientCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

    const { tenant_id, name, internal_code, synonyms = [], tags = [] } = parsed.data;

    const client = await app.db.connect();
    try {
      await client.query("begin");

      const ing = await client.query(
        `insert into ingredient (tenant_id, name, internal_code, synonyms, tags)
         values ($1, $2, $3, $4, $5)
         returning id, tenant_id, name, internal_code, synonyms, tags, updated_at`,
        [tenant_id, name, internal_code ?? null, synonyms, tags]
      );

      const row = ing.rows[0];

      await client.query(
        `insert into outbox_event (tenant_id, event_type, aggregate_type, aggregate_id, payload)
         values ($1, 'ingredient.upserted', 'ingredient', $2, $3::jsonb)`,
        [tenant_id, row.id, JSON.stringify(row)]
      );

      await client.query("commit");
      return reply.code(201).send(row);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  });
}
