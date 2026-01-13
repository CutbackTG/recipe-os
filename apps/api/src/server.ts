import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { redisPlugin, type RedisLike } from "./plugins/redis.js";
import dbPlugin from "./plugins/db.js";
import opensearchPlugin from "./plugins/opensearch.js";
import { authPlugin } from "./plugins/auth.js";
import { ingredientRoutes } from "./routes/ingredients.js";
import { searchRoutes } from "./routes/search.js";
import { recipeRoutes } from "./routes/recipes.js";
import { draftRoutes } from "./routes/drafts.js";

function envFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return raw.toLowerCase() === "true" || raw === "1" || raw.toLowerCase() === "yes";
}

// Minimal Redis shim for dev when Redis isn't running
const noRedis: RedisLike = {
  get: async () => null,
  setEx: async () => null
};

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // ---- Required infra ----
  await app.register(dbPlugin);

  // ---- Optional infra ----
  const enableRedis = envFlag("REDIS_ENABLED", true);
  const enableOpenSearch = envFlag("OPENSEARCH_ENABLED", true);

  // Redis
  if (enableRedis) {
    try {
      await app.register(redisPlugin);
    } catch (err) {
      app.log.warn({ err }, "Redis unavailable, continuing without cache");
      app.decorate("redis", noRedis);
    }
  } else {
    app.decorate("redis", noRedis);
  }

  // OpenSearch
  if (enableOpenSearch) {
    try {
      await app.register(opensearchPlugin);
    } catch (err) {
      app.log.warn({ err }, "OpenSearch unavailable, continuing without search index");
      app.decorate("os", null);
    }
  } else {
    app.decorate("os", null);
  }

  // ---- Auth ----
  const authMode = (process.env.AUTH_MODE ?? "okta").toLowerCase();

  if (authMode === "okta") {
    await app.register(authPlugin);
  } else {
    // Dev mode: bypass auth
    app.decorate("requireAuth", async () => {});
    app.get("/me", async () => ({ user: { email: "dev@premierfoods.co.uk" } }));
  }

  // ---- Routes ----
  await app.register(ingredientRoutes);
  await app.register(searchRoutes);
  await app.register(recipeRoutes);
  await app.register(draftRoutes);

  // ---- Ops ----
  app.get("/health", async () => ({ ok: true }));

  return app;
}

async function main() {
  const app = await buildServer();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
