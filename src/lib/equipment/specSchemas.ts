import { z } from "zod";

export const EQUIPMENT_TYPES = ["compressor", "controller", "dryer"] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export type SpecFieldDef = {
  key: string;
  label: string;
  kind: "text" | "number" | "select";
  options?: string[];
  unit?: string;
};

export const compressorSpecSchema = z.object({
  compressorStyle: z
    .enum(["rotary_screw", "reciprocating", "centrifugal", "scroll"])
    .optional(),
  driveType: z.enum(["fixed_speed", "vsd"]).optional(),
  hp: z.coerce.number().positive().optional(),
  maxPressurePsi: z.coerce.number().positive().optional(),
  ratedCapacityCfm: z.coerce.number().positive().optional(),
  voltage: z.string().optional(),
});

export const dryerSpecSchema = z.object({
  dryerType: z.enum(["refrigerated", "desiccant", "membrane"]).optional(),
  dewPointF: z.coerce.number().optional(),
  ratedFlowCfm: z.coerce.number().positive().optional(),
  maxInletTempF: z.coerce.number().optional(),
});

export const controllerSpecSchema = z.object({
  compatibleWith: z.string().optional(),
  ioCount: z.coerce.number().int().nonnegative().optional(),
  firmwareVersion: z.string().optional(),
  communicationProtocols: z.string().optional(),
});

export const specSchemaByType: Record<EquipmentType, z.ZodObject<z.ZodRawShape>> = {
  compressor: compressorSpecSchema,
  dryer: dryerSpecSchema,
  controller: controllerSpecSchema,
};

export const specFieldsByType: Record<EquipmentType, SpecFieldDef[]> = {
  compressor: [
    {
      key: "compressorStyle",
      label: "Compressor style",
      kind: "select",
      options: ["rotary_screw", "reciprocating", "centrifugal", "scroll"],
    },
    {
      key: "driveType",
      label: "Drive type",
      kind: "select",
      options: ["fixed_speed", "vsd"],
    },
    { key: "hp", label: "Horsepower", kind: "number", unit: "hp" },
    {
      key: "maxPressurePsi",
      label: "Max pressure",
      kind: "number",
      unit: "psi",
    },
    {
      key: "ratedCapacityCfm",
      label: "Rated capacity",
      kind: "number",
      unit: "cfm",
    },
    { key: "voltage", label: "Voltage", kind: "text" },
  ],
  dryer: [
    {
      key: "dryerType",
      label: "Dryer type",
      kind: "select",
      options: ["refrigerated", "desiccant", "membrane"],
    },
    { key: "dewPointF", label: "Dew point", kind: "number", unit: "°F" },
    {
      key: "ratedFlowCfm",
      label: "Rated flow",
      kind: "number",
      unit: "cfm",
    },
    {
      key: "maxInletTempF",
      label: "Max inlet temp",
      kind: "number",
      unit: "°F",
    },
  ],
  controller: [
    { key: "compatibleWith", label: "Compatible with", kind: "text" },
    { key: "ioCount", label: "I/O count", kind: "number" },
    { key: "firmwareVersion", label: "Firmware version", kind: "text" },
    {
      key: "communicationProtocols",
      label: "Communication protocols",
      kind: "text",
    },
  ],
};

export function parseSpecs(type: EquipmentType, raw: Record<string, unknown>) {
  const schema = specSchemaByType[type];
  const result = schema.parse(raw);
  // Drop undefined keys so empty optional fields don't clutter the jsonb value.
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== undefined && v !== "")
  );
}
