export interface JointEfficiencyOption {
  key: string;
  value: number;
  label: string;
}

// AS 1210—2010 Table 3.5.1.7 — Welded Joint Efficiencies.
export const JOINT_EFFICIENCY_OPTIONS: JointEfficiencyOption[] = [
  { key: "dwb-full", value: 1.0, label: "Double-welded butt (or equivalent), full RT — Class 1/1H/2H/S/2S" },
  { key: "dwb-spot-2h2s", value: 1.0, label: "Double-welded butt (or equivalent), spot RT — Class 2H/2S" },
  { key: "swb-backing-full", value: 1.0, label: "Single-welded butt w/ backing strip, full RT — Class 1/1H/2H/S/2S" },
  { key: "dwb-spot-2a", value: 0.85, label: "Double-welded butt (or equivalent), spot RT — Class 2A" },
  { key: "dwb-none-2b", value: 0.8, label: "Double-welded butt (or equivalent), no RT — Class 2B" },
  { key: "swb-backing-spot-2a", value: 0.8, label: "Single-welded butt w/ backing strip, spot RT — Class 2A" },
  { key: "swb-backing-none-2b", value: 0.75, label: "Single-welded butt w/ backing strip, no RT — Class 2B" },
  { key: "dwb-none-3", value: 0.7, label: "Double-welded butt (or equivalent), no RT — Class 3" },
  { key: "swb-nobacking-2a", value: 0.7, label: "Single-welded butt, no backing strip — Class 2A" },
  { key: "swb-backing-none-3", value: 0.65, label: "Single-welded butt w/ backing strip, no RT — Class 3" },
  { key: "swb-nobacking-2b", value: 0.65, label: "Single-welded butt, no backing strip — Class 2B" },
  { key: "swb-nobacking-3", value: 0.6, label: "Single-welded butt, no backing strip — Class 3" },
  { key: "dfl-lap-3", value: 0.55, label: "Double full fillet-welded lap joint — Class 3 only" },
  { key: "sfl-lap-plug-3", value: 0.5, label: "Single full fillet lap joint w/ plug welds — Class 3 only" },
  { key: "sfl-lap-noplug-3", value: 0.45, label: "Single full fillet-welded lap joint, no plug welds — Class 3 only" },
];

export const DEFAULT_JOINT_EFFICIENCY_KEY = "dwb-full";

export function jointEfficiencyValue(key: string): number | null {
  return JOINT_EFFICIENCY_OPTIONS.find((o) => o.key === key)?.value ?? null;
}

export interface AllowableStressOption {
  key: string;
  value: number;
  label: string;
}

// AS 1210—2010 Table B1(B) — design tensile strength, Class 1/2A/2B/3 vessels,
// carbon and carbon-manganese plate, at 50°C. AS 1548 grades read from the
// t ≤ 16 mm band (identical to thicker bands at this temperature); AS/NZS
// 3678 grades are not thickness-banded.
export const ALLOWABLE_STRESS_OPTIONS: AllowableStressOption[] = [
  { key: "as1548-pt430", value: 124, label: "AS 1548 PT430 plate" },
  { key: "as1548-pt460", value: 133, label: "AS 1548 PT460 plate" },
  { key: "as1548-pt490", value: 142, label: "AS 1548 PT490 plate" },
  { key: "as1548-pt540", value: 156, label: "AS 1548 PT540 plate" },
  { key: "as3678-gr250", value: 108, label: "AS/NZS 3678 Grade 250 plate" },
  { key: "as3678-gr300", value: 113, label: "AS/NZS 3678 Grade 300 plate" },
  { key: "as3678-gr350", value: 118, label: "AS/NZS 3678 Grade 350 plate" },
  { key: "as3678-gr400", value: 126, label: "AS/NZS 3678 Grade 400 plate" },
];

export const DEFAULT_ALLOWABLE_STRESS_KEY = "as1548-pt430";

export function allowableStressValue(key: string): number | null {
  return ALLOWABLE_STRESS_OPTIONS.find((o) => o.key === key)?.value ?? null;
}
