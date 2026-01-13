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
