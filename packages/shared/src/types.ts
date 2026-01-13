export type TenantId = string;
export type SiteId = string;

export type Ingredient = {
  id: string;
  tenant_id: TenantId;
  name: string;
  internal_code?: string | null;
  synonyms?: string[];      // org-specific
  tags?: string[];          // functional tags
  status_by_site?: Record<SiteId, "approved" | "blocked" | "preferred">;
  updated_at: string;
};

export type OutboxEventType = "ingredient.upserted";

export type OutboxEvent = {
  id: string;
  tenant_id: TenantId;
  event_type: OutboxEventType;
  aggregate_type: "ingredient";
  aggregate_id: string;
  payload: unknown;
  created_at: string;
  processed_at?: string | null;
};
