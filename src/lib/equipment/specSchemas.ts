import { z } from "zod";

export const EQUIPMENT_TYPES = [
  "compressor",
  "controller",
  "dryer",
  "line_filter",
  "breathing_air",
  "oily_water_separator",
  "vacuum_pump",
  "generator",
  "nitrogen_generator",
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export function formatEquipmentTypeLabel(type: string) {
  return type.replace(/_/g, " ");
}

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
  powerSource: z.enum(["electric", "diesel", "petrol"]).optional(),
  driveType: z.enum(["fixed_speed", "vsd"]).optional(),
  hp: z.coerce.number().positive().optional(),
  maxPressurePsi: z.coerce.number().positive().optional(),
  ratedCapacityCfm: z.coerce.number().positive().optional(),
  voltage: z.string().optional(),
});

export const dryerSpecSchema = z.object({
  dryerType: z.enum(["refrigerated", "desiccant", "membrane"]).optional(),
  mounting: z.enum(["integrated", "basemount", "external"]).optional(),
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

export const lineFilterSpecSchema = z.object({
  filterPosition: z
    .enum(["pre", "post", "activated_carbon", "water_separator"])
    .optional(),
  micronRating: z.coerce.number().positive().optional(),
  elementPartNumber: z.string().optional(),
  ratedFlowCfm: z.coerce.number().positive().optional(),
});

export const breathingAirSpecSchema = z.object({
  numberOfStages: z.coerce.number().int().positive().optional(),
  outletCount: z.coerce.number().int().nonnegative().optional(),
  standard: z.string().optional(),
});

export const oilyWaterSeparatorSpecSchema = z.object({
  ratedFlowCfm: z.coerce.number().positive().optional(),
});

export const vacuumPumpSpecSchema = z.object({
  vacuumPumpType: z
    .enum(["liquid_ring", "rotary_screw", "rotary_vane", "other"])
    .optional(),
  ratedFlowCfm: z.coerce.number().positive().optional(),
  maxVacuum: z.string().optional(),
});

export const generatorSpecSchema = z.object({
  fuelType: z.enum(["petrol", "diesel"]).optional(),
  ratedKva: z.coerce.number().positive().optional(),
  voltage: z.string().optional(),
});

export const nitrogenGeneratorSpecSchema = z.object({
  purityPercent: z.coerce.number().positive().optional(),
  ratedFlowCfm: z.coerce.number().positive().optional(),
});

export const specSchemaByType: Record<EquipmentType, z.ZodObject<z.ZodRawShape>> = {
  compressor: compressorSpecSchema,
  dryer: dryerSpecSchema,
  controller: controllerSpecSchema,
  line_filter: lineFilterSpecSchema,
  breathing_air: breathingAirSpecSchema,
  oily_water_separator: oilyWaterSeparatorSpecSchema,
  vacuum_pump: vacuumPumpSpecSchema,
  generator: generatorSpecSchema,
  nitrogen_generator: nitrogenGeneratorSpecSchema,
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
      key: "powerSource",
      label: "Power source",
      kind: "select",
      options: ["electric", "diesel", "petrol"],
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
    {
      key: "mounting",
      label: "Mounting",
      kind: "select",
      options: ["integrated", "basemount", "external"],
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
  line_filter: [
    {
      key: "filterPosition",
      label: "Filter position",
      kind: "select",
      options: ["pre", "post", "activated_carbon", "water_separator"],
    },
    {
      key: "micronRating",
      label: "Micron rating",
      kind: "number",
      unit: "µm",
    },
    { key: "elementPartNumber", label: "Element part number", kind: "text" },
    {
      key: "ratedFlowCfm",
      label: "Rated flow",
      kind: "number",
      unit: "cfm",
    },
  ],
  breathing_air: [
    {
      key: "numberOfStages",
      label: "Number of stages",
      kind: "number",
    },
    { key: "outletCount", label: "Outlet count", kind: "number" },
    { key: "standard", label: "Standard", kind: "text" },
  ],
  oily_water_separator: [
    {
      key: "ratedFlowCfm",
      label: "Rated flow",
      kind: "number",
      unit: "cfm",
    },
  ],
  vacuum_pump: [
    {
      key: "vacuumPumpType",
      label: "Vacuum pump type",
      kind: "select",
      options: ["liquid_ring", "rotary_screw", "rotary_vane", "other"],
    },
    {
      key: "ratedFlowCfm",
      label: "Rated flow",
      kind: "number",
      unit: "cfm",
    },
    { key: "maxVacuum", label: "Max vacuum", kind: "text" },
  ],
  generator: [
    {
      key: "fuelType",
      label: "Fuel type",
      kind: "select",
      options: ["petrol", "diesel"],
    },
    { key: "ratedKva", label: "Rated output", kind: "number", unit: "kVA" },
    { key: "voltage", label: "Voltage", kind: "text" },
  ],
  nitrogen_generator: [
    {
      key: "purityPercent",
      label: "Purity",
      kind: "number",
      unit: "%",
    },
    {
      key: "ratedFlowCfm",
      label: "Rated flow",
      kind: "number",
      unit: "cfm",
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
