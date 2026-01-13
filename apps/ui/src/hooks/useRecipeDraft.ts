import { useEffect, useState } from "react";
import { fetchRecipeDraft } from "../api/recipes";
import type { RecipeDraft } from "../types/recipe";

export function useRecipeDraft(id: string | null, enabled: boolean) {
  const [data, setData] = useState<RecipeDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRecipeDraft(id)
      .then((r) => {
        if (cancelled) return;
        setData(r);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? String(e));
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, enabled]);

  return { data, loading, error };
}
