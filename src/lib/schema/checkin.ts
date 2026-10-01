// src/lib/schema/checkin.ts
export {
  CheckInStatusEnum,
  type CheckInStatus,
  CheckInMethodEnum,
  type CheckInMethod,
  CheckInSchema,
  type CheckInRecord,
} from "./attendance";

import { CheckInSchema, CheckInRecord } from "./attendance";

export const GigCheckinSchema = CheckInSchema;
export type GigCheckin = CheckInRecord;

