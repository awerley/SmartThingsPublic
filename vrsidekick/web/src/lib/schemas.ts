import { z } from "zod";

export const propertySchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  zip: z.string().regex(/^\d{5}$/),
  notes: z.string().max(4000).nullable().optional(),
});

export const wantedAdSchema = z.object({
  taskTypeId: z.string(),
  propertyId: z.string().nullable().optional(),
  title: z.string().min(3).max(140),
  description: z.string().min(10).max(4000),
  zip: z.string().regex(/^\d{5}$/),
  budgetCents: z.number().int().min(0).max(10_000_00).nullable().optional(),
  rateType: z.enum(["HOURLY", "FLAT"]).nullable().optional(),
  recurring: z.boolean().default(false),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).nullable().optional(),
  preferredDate: z.coerce.date().nullable().optional(),
});
