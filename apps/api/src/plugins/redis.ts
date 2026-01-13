import type { FastifyInstance } from "fastify";
import { createClient } from "redis";

// Minimal Redis surface used by our app (keep it simple for typing + shims)
export type RedisLike = {
  get(key: string): Promise<string | null>;
  setEx(key: string, ttlSeconds: number, value: string): Promise<unknown>;
};

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisLike;
  }
}

export async function redisPlugin(app: FastifyInstance) {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";

  const client = createClient({ url });

  client.on("error", (err) => {
    app.log.error({ err }, "Redis client error");
  });

  await client.connect();

  // Wrap to match our RedisLike signature (avoids RedisClientType generics drama)
  const redis: RedisLike = {
    get: (key) => client.get(key),
    setEx: (key, ttl, value) => client.setEx(key, ttl, value)
  };

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    try {
      await client.quit();
    } catch (err) {
      app.log.warn({ err }, "Redis quit failed");
    }
  });
}
