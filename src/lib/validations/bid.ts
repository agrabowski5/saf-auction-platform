import { z } from "zod";

export const bidSchema = z.object({
  safCategory: z.string().min(1, "Select a SAF category"),
  quantity: z.number().positive("Quantity must be positive"),
  maxPrice: z.number().positive("Price must be positive"),
  allowSubstitution: z.boolean().default(false),
  categoryPreferences: z
    .array(
      z.object({
        category: z.string(),
        quantity: z.number().positive(),
        maxPrice: z.number().positive(),
        priority: z.number().int().positive(),
      })
    )
    .optional(),
});

export type BidInput = z.infer<typeof bidSchema>;
