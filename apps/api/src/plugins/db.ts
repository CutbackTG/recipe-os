import type { FastifyInstance } from "fastify";
import pg from "pg";

declare module "fastify" {
  interface FastifyInstance {
    db: pg.Pool;
  }
}

export async function dbPlugin(app: FastifyInstance) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const pool = new pg.Pool({ connectionString: url });
  app.decorate("db", pool);

  app.addHook("onClose", async () => {
    await pool.end();
  });
}
