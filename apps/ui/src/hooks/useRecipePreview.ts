import { useEffect, useState } from "react";
import { fetchRecipePreview } from "../api/recipes";
import type { RecipePreview } from "../types/recipe";

export function useRecipePreview(id: string | null) {
  const [data, setData] = useState<RecipePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRecipePreview(id)
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
  }, [id]);

  return { data, loading, error };
}
