import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: databaseUrl });

  const sqlPath = path.join(process.cwd(), "src", "db", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query("create extension if not exists pg_trgm;");
  await pool.query(sql);

  await pool.end();
  console.log("✅ migration complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
