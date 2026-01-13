import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Client } from "@opensearch-project/opensearch";

declare module "fastify" {
  interface FastifyInstance {
    os: Client;
  }
}

export default fp(async (app: FastifyInstance) => {
  const node = process.env.OPENSEARCH_URL;
  if (!node) throw new Error("OPENSEARCH_URL missing");
  const client = new Client({ node });
  app.decorate("os", client);
});
