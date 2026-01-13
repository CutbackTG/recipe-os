import { useEffect, useMemo, useState } from "react";
import { search } from "../api/search";
import type { SearchItem } from "../types/search";

export function useSearchQuery(args: {
  q: string;
  tenant_id: string;
  site_id: string;
  enabled: boolean;
}) {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(
    () => `${args.tenant_id}:${args.site_id}:${args.q}`,
    [args.tenant_id, args.site_id, args.q]
  );

  useEffect(() => {
    if (!args.enabled) return;
    const q = args.q.trim();
    if (q.length < 1) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    search({
      q,
      tenant_id: args.tenant_id,
      site_id: args.site_id,
      types: "recipe",
    })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? String(e));
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, args.enabled, args.q, args.tenant_id, args.site_id]);

  return { items, loading, error };
}
