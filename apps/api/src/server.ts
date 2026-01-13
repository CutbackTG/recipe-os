import Fastify from "fastify";
import { dbPlugin } from "./plugins/db.js";
import { redisPlugin } from "./plugins/redis.js";
import { opensearchPlugin } from "./plugins/opensearch.js";
import { searchRoutes } from "./routes/search.js";
import { ingredientRoutes } from "./routes/ingredients.js";

const app = Fastify({ logger: true });

await app.register(dbPlugin);
await app.register(redisPlugin);
await app.register(opensearchPlugin);

await app.register(searchRoutes);
await app.register(ingredientRoutes);

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
