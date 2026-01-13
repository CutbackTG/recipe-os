import { z } from "zod";

export const IngredientCreateSchema = z.object({
  tenant_id: z.string().min(1),
  name: z.string().min(1),
  internal_code: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  tenant_id: z.string().min(1),
  site_id: z.string().min(1),
  types: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()) : ["ingredient", "recipe"]))
});

export const RecipeCreateSchema = z.object({
  tenant_id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().optional()
});

export const DraftCreateSchema = z.object({
  tenant_id: z.string().min(1),
  recipe_id: z.string().uuid(),
  name: z.string().min(1),
  created_by: z.string().optional()
});

export const LineItemUpsertSchema = z.object({
  ingredient_id: z.string().uuid(),
  pct: z.number().min(0).max(100),
  note: z.string().optional()
});

export const LineItemsBulkSchema = z.object({
  tenant_id: z.string().min(1),
  items: z.array(LineItemUpsertSchema).min(1)
});

export const ComputeDraftSchema = z.object({
  tenant_id: z.string().min(1)
});
