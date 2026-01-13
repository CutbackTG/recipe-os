export type RecipePreview = {
  id: string;
  code?: string | null;
  name: string;
  tags?: string[];
  allergens?: string[];
  kpis?: {
    cost_per_kg?: number | null;
    protein_per_100g?: number | null;
    sugar_per_100g?: number | null;
  };
  top_ingredients?: { name: string; pct: number }[];
};

export type RecipeDraft = {
  recipe_id: string;
  draft_id: string;
  line_items: { ingredient_id: string; name: string; pct: number }[];
  rollups?: {
    total_pct?: number;
    protein_per_100g?: number | null;
    sugar_per_100g?: number | null;
    cost_per_kg?: number | null;
    allergens?: string[];
  };
  warnings?: { code: string; message: string }[];
};
