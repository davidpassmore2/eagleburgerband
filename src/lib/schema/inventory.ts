import { z } from "zod";

export const AssetCategoryEnum = z.enum([
  "instrument",
  "harness",
  "audio_pa",
  "banner_merch",
  "hardware",
]);
export type AssetCategory = z.infer<typeof AssetCategoryEnum>;

export const AssetConditionEnum = z.enum([
  "excellent",
  "good",
  "needs_repair",
  "retired",
]);
export type AssetCondition = z.infer<typeof AssetConditionEnum>;

export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: AssetCategoryEnum.default("instrument"),
  serialNumber: z.string().default(""),
  condition: AssetConditionEnum.default("good"),
  assignedToUid: z.string().default(""),
  assignedToName: z.string().default(""),
  locationNotes: z.string().default(""),
  updatedAt: z.string().default(""),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

