import { getJson } from "./http";
import type { RecipePreview, RecipeDraft } from "../types/recipe";

export function fetchRecipePreview(id: string) {
  return getJson<RecipePreview>(`/recipes/${encodeURIComponent(id)}/preview`);
}

export function fetchRecipeDraft(id: string) {
  return getJson<RecipeDraft>(`/recipes/${encodeURIComponent(id)}/draft`);
}
