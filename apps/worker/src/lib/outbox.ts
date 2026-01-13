import pg from "pg";

export async function fetchUnprocessed(pool: pg.Pool, limit = 100) {
  const r = await pool.query(
    `select id, tenant_id, event_type, aggregate_type, aggregate_id, payload, created_at
     from outbox_event
     where processed_at is null
     order by created_at asc
     limit $1`,
    [limit]
  );
  return r.rows;
}

export async function markProcessed(pool: pg.Pool, ids: string[]) {
  if (ids.length === 0) return;
  await pool.query(
    `update outbox_event set processed_at = now() where id = any($1::uuid[])`,
    [ids]
  );
}
