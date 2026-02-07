import { z } from "zod";

export const askSchema = z.object({
  safCategory: z.string().min(1, "Select a SAF category"),
  quantity: z.number().positive("Quantity must be positive"),
  minPrice: z.number().positive("Price must be positive"),
  facilityId: z.string().optional(),
  categoryOffers: z
    .array(
      z.object({
        category: z.string(),
        quantity: z.number().positive(),
        minPrice: z.number().positive(),
      })
    )
    .optional(),
});

export type AskInput = z.infer<typeof askSchema>;
