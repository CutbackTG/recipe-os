import { getJson } from "./http";
import type { TypeaheadResponse, SearchResponse } from "../types/search";

export function typeahead(params: {
  q: string;
  tenant_id: string;
  site_id: string;
  types?: string; // "recipe,ingredient"
  limit?: number;
}) {
  const qp = new URLSearchParams({
    q: params.q,
    tenant_id: params.tenant_id,
    site_id: params.site_id,
    types: params.types ?? "recipe,ingredient",
    limit: String(params.limit ?? 10),
  });
  return getJson<TypeaheadResponse>(`/typeahead?${qp.toString()}`);
}

export function search(params: {
  q: string;
  tenant_id: string;
  site_id: string;
  types?: string; // "recipe"
  cursor?: string;
}) {
  const qp = new URLSearchParams({
    q: params.q,
    tenant_id: params.tenant_id,
    site_id: params.site_id,
    types: params.types ?? "recipe",
  });
  if (params.cursor) qp.set("cursor", params.cursor);
  return getJson<SearchResponse>(`/search?${qp.toString()}`);
}
