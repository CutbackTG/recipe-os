import type { FastifyInstance } from "fastify";
import { createClient } from "redis";

declare module "fastify" {
  interface FastifyInstance {
    redis: ReturnType<typeof createClient>;
  }
}

export async function redisPlugin(app: FastifyInstance) {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL missing");
  const client = createClient({ url });
  await client.connect();
  app.decorate("redis", client);

  app.addHook("onClose", async () => {
    await client.quit();
  });
}
