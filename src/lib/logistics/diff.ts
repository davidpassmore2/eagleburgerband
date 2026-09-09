export type LogisticsFields = {
  date?: string;
  callTime?: string;
  downbeat?: string;
  attire?: string;
  unloadingAddress?: string;
  parkingNotes?: string;
  compensation?: number;
};

export type FieldDiff = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

const FIELD_LABELS: Record<keyof LogisticsFields, string> = {
  date: "Date",
  callTime: "Call Time",
  downbeat: "Downbeat",
  attire: "Attire / Uniform",
  unloadingAddress: "Unloading Location",
  parkingNotes: "Parking Notes",
  compensation: "Musician Pay",
};

export function diffLogistics(
  oldLogistics: LogisticsFields,
  newLogistics: LogisticsFields
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  (Object.keys(FIELD_LABELS) as Array<keyof LogisticsFields>).forEach((key) => {
    const oldVal = oldLogistics[key] !== undefined ? String(oldLogistics[key]).trim() : "";
    const newVal = newLogistics[key] !== undefined ? String(newLogistics[key]).trim() : "";

    if (oldVal !== newVal && (oldVal || newVal)) {
      diffs.push({
        field: key,
        label: FIELD_LABELS[key],
        oldValue: oldVal || "(empty)",
        newValue: newVal || "(removed)",
      });
    }
  });

  return diffs;
}