import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Pool } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
  }
}

export default fp(async (app: FastifyInstance) => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const pool = new Pool({ connectionString: url });
  app.decorate("db", pool);

  app.addHook("onClose", async () => {
    await pool.end();
  });
});
