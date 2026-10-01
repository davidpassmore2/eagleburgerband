// src/lib/schema/rsvp.ts
export {
  RsvpStatusEnum,
  type RsvpStatus,
  RsvpSchema,
  type RsvpRecord,
} from "./attendance";

import { RsvpSchema, RsvpRecord } from "./attendance";

export const GigRsvpSchema = RsvpSchema;
export type GigRsvp = RsvpRecord;

