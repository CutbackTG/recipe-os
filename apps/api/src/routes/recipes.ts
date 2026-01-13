import type { FastifyInstance, FastifyRequest } from "fastify";
import { RecipeCreateSchema, DraftCreateSchema } from "@hg2/shared";

export async function recipeRoutes(app: FastifyInstance) {
  // Create recipe
  app.post(
    "/recipes",
    { preHandler: app.requireAuth },
    async (req: FastifyRequest, reply) => {
      const parsed = RecipeCreateSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

      const { tenant_id, name, code } = parsed.data;

      const r = await app.db.query(
        `insert into recipe (tenant_id, name, code)
         values ($1, $2, $3)
         returning *`,
        [tenant_id, name, code ?? null]
      );

      return reply.code(201).send(r.rows[0]);
    }
  );

  // Create draft for a recipe
  app.post(
    "/drafts",
    { preHandler: app.requireAuth },
    async (req: FastifyRequest, reply) => {
      const parsed = DraftCreateSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send(parsed.error.flatten());

      const { tenant_id, recipe_id, name, created_by } = parsed.data;

      const r = await app.db.query(
        `insert into recipe_draft (tenant_id, recipe_id, name, created_by)
         values ($1, $2::uuid, $3, $4)
         returning *`,
        [tenant_id, recipe_id, name, created_by ?? null]
      );

      return reply.code(201).send(r.rows[0]);
    }
  );
}
