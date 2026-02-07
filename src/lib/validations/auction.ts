import { z } from "zod";

export const createAuctionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  auctionType: z.enum(["vickrey", "vcg"]).default("vickrey"),
  categories: z.array(z.string()).min(1, "Select at least one SAF category"),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)),
  reservePricePerGal: z.number().positive().optional(),
  aggregateReserve: z.number().positive().optional(),
  minBidQuantity: z.number().min(0).default(0),
  maxBidQuantity: z.number().positive().optional(),
  substitutionMatrix: z.record(z.string(), z.number()).optional(),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
