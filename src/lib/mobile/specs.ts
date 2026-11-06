import {
  specFieldsByType,
  type EquipmentType,
} from "@/lib/equipment/specSchemas";

/**
 * Pure formatting of the equipment `specs` jsonb blob for the mobile
 * snapshot. Deliberately has no DB import so it can be exercised directly.
 *
 * Every rule here mirrors src/app/equipment/[id]/page.tsx — the app shows
 * the same labels and units as the website, so the two must not drift. If
 * you change the page, change this.
 *
 * One intentional difference: the page can throw on a pathological value
 * (a spec whose toString() throws); these routes must never return anything
 * but JSON, so value stringification is defensive here.
 */

export type LabelledValue = { label: string; value: string };

export type PressureOptionRow = {
  workingPressureMpa: string | null;
  maxPressureMpa: string | null;
  capacityLs: string | null;
  capacityCfm: string | null;
};

function safeString(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "";
  }
}

function nullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return safeString(value);
}

/** Mirrors formatDimensions() in src/app/equipment/[id]/page.tsx. */
export function formatDimensions(d: unknown): string {
  if (typeof d === "string") return d;
  if (d && typeof d === "object") {
    const obj = d as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.A_disassembly) parts.push(`A (disassembly): ${safeString(obj.A_disassembly)}`);
    if (obj.B) parts.push(`B: ${safeString(obj.B)}`);
    if (obj.C) parts.push(`C: ${safeString(obj.C)}`);
    return parts.join(" · ") || "—";
  }
  return "—";
}

/**
 * The "Specs" section: the fields declared for this equipment type, in
 * schema order, skipping undefined and empty-string values.
 *
 * Select values are emitted exactly as stored (e.g. "rotary_screw") because
 * that is what the website renders — it does not humanise them. Keys present
 * in the blob but absent from specFieldsByType are omitted, again matching
 * the page, which only iterates the declared fields.
 */
export function buildSpecs(
  type: string,
  specs: Record<string, unknown>
): LabelledValue[] {
  const fields = specFieldsByType[type as EquipmentType] ?? [];
  return fields
    .filter((f) => specs[f.key] !== undefined && specs[f.key] !== "")
    .map((f) => ({
      label: f.label,
      value: `${safeString(specs[f.key])}${f.unit ? ` ${f.unit}` : ""}`,
    }));
}

/** Mirrors the `hasData` guard in CatalogPerformanceSection. */
export function hasPerformanceData(specs: Record<string, unknown>): boolean {
  return Boolean(
    specs.outlet ||
      specs.weightKg ||
      specs.dimensionsMm ||
      specs.motorPowerKw ||
      specs.noiseLevelDba ||
      specs.refrigerant ||
      specs.capacityLmin ||
      specs.maxPressureBar ||
      specs.pressureOptions
  );
}

/**
 * The "Performance data" stat grid, in the page's render order. Returns []
 * when the page would render nothing, so the app can hide the section on
 * exactly the same condition.
 */
export function buildPerformance(
  specs: Record<string, unknown>
): LabelledValue[] {
  if (!hasPerformanceData(specs)) return [];

  const rows: LabelledValue[] = [];
  const push = (key: string, label: string, format: (v: unknown) => string) => {
    if (specs[key] !== undefined) rows.push({ label, value: format(specs[key]) });
  };

  push("motorPowerKw", "Motor power", (v) => `${safeString(v)} kW`);
  push("noiseLevelDba", "Noise level", (v) => `${safeString(v)} dBA`);
  push("outlet", "Port size", safeString);
  push("recommendedPipe", "Recommended pipe", safeString);
  push("weightKg", "Weight", (v) => `${safeString(v)} kg`);
  push("dimensionsMm", "Dimensions (mm)", formatDimensions);
  push("refrigerant", "Refrigerant", safeString);
  push("powerSupply", "Power supply", safeString);
  push("maxPressureBar", "Max pressure", (v) => `${safeString(v)} bar`);
  push("capacityLmin", "Max flow", (v) => `${safeString(v)} L/min`);
  push("capacityM3h", "Max flow", (v) => `${safeString(v)} m³/h`);

  return rows;
}

/** The pressure/flow table rows, if the blob carries any. */
export function buildPressureOptions(
  specs: Record<string, unknown>
): PressureOptionRow[] {
  const raw = Array.isArray(specs.pressureOptions) ? specs.pressureOptions : [];
  return raw.map((entry) => {
    const opt =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : {};
    return {
      workingPressureMpa: nullableString(opt.workingPressure_mpa),
      maxPressureMpa: nullableString(opt.maxPressure_mpa),
      capacityLs: nullableString(opt.capacity_ls),
      capacityCfm: nullableString(opt.capacity_cfm),
    };
  });
}
