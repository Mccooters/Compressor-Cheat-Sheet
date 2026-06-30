import "./load-env";
import fs from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { equipment } from "./schema";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

const COMMIT = process.argv.includes("--commit");
const CATALOG_PATH =
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "/Users/joshuamccarty/Projects/Untitled/Air-System-Sketcher/equipment-catalog.json";

const MANUFACTURER = "Chicago Pneumatic";

type CatalogEntry = {
  id: string;
  type: string;
  brand?: string;
  model: string;
  series?: string;
  variant?: string;
  motorPower_kW?: number;
  motorPower_hp?: number;
  noiseLevel_dBA?: number;
  dimensions_mm?: string | Record<string, number>;
  weight_kg?: number;
  outlet?: string;
  recommendedPipe?: string;
  pressureOptions?: Record<string, unknown>[];
  dryerType?: string;
  refrigerant?: string;
  capacity_lmin?: number;
  capacity_cfm?: number;
  capacity_m3h?: number;
  maxPressure_bar?: number;
  powerSupply?: string;
  maxPressure_psi?: number;
  notes?: string;
};

const TYPE_MAP: Record<string, EquipmentType | null> = {
  Compressor: "compressor",
  Dryer: "dryer",
  Receiver: null,
};

// Same normalization as importAssets.ts so catalog names match extracted asset names.
function normalizeModelSpacing(model: string): string {
  return model.replace(/^([A-Za-z]+)\s+(?=\d)/, "$1");
}

function isPlaceholder(entry: CatalogEntry): boolean {
  return entry.notes?.toLowerCase().includes("placeholder") ?? false;
}

function inferDriveType(entry: CatalogEntry): "vsd" | "fixed_speed" {
  const s = (entry.series ?? "").toUpperCase();
  if (s === "CPMV" || s === "CPVS") return "vsd";
  return "fixed_speed";
}

function buildCatalogSpecs(
  entry: CatalogEntry,
  dbType: EquipmentType
): Record<string, unknown> {
  const s: Record<string, unknown> = {};

  // Shared across all types
  if (entry.outlet !== undefined) s.outlet = entry.outlet;
  if (entry.recommendedPipe !== undefined) s.recommendedPipe = entry.recommendedPipe;
  if (entry.weight_kg !== undefined) s.weightKg = entry.weight_kg;
  if (entry.dimensions_mm !== undefined) s.dimensionsMm = entry.dimensions_mm;
  if (entry.series !== undefined) s.series = entry.series;

  if (dbType === "compressor") {
    s.compressorStyle = "rotary_screw";
    s.powerSource = "electric";
    s.driveType = inferDriveType(entry);
    if (entry.motorPower_kW !== undefined) s.motorPowerKw = entry.motorPower_kW;
    if (entry.motorPower_hp !== undefined) s.hp = entry.motorPower_hp;
    if (entry.noiseLevel_dBA !== undefined) s.noiseLevelDba = entry.noiseLevel_dBA;
    if (entry.variant !== undefined) s.variant = entry.variant;
    if (entry.pressureOptions !== undefined) s.pressureOptions = entry.pressureOptions;
  }

  if (dbType === "dryer") {
    if (entry.dryerType !== undefined) {
      const map: Record<string, string> = {
        Refrigerant: "refrigerated",
        Desiccant: "desiccant",
        Membrane: "membrane",
      };
      s.dryerType = map[entry.dryerType] ?? entry.dryerType.toLowerCase();
    }
    if (entry.refrigerant !== undefined) s.refrigerant = entry.refrigerant;
    if (entry.capacity_lmin !== undefined) s.capacityLmin = entry.capacity_lmin;
    if (entry.capacity_cfm !== undefined) s.ratedFlowCfm = entry.capacity_cfm;
    if (entry.capacity_m3h !== undefined) s.capacityM3h = entry.capacity_m3h;
    if (entry.maxPressure_bar !== undefined) s.maxPressureBar = entry.maxPressure_bar;
    if (entry.powerSupply !== undefined) s.powerSupply = entry.powerSupply;
  }

  if (dbType === "line_filter") {
    if (entry.capacity_lmin !== undefined) s.capacityLmin = entry.capacity_lmin;
    if (entry.capacity_cfm !== undefined) s.ratedFlowCfm = entry.capacity_cfm;
    if (entry.capacity_m3h !== undefined) s.capacityM3h = entry.capacity_m3h;
    if (entry.maxPressure_bar !== undefined) s.maxPressureBar = entry.maxPressure_bar;
    if (entry.maxPressure_psi !== undefined) s.maxPressurePsi = entry.maxPressure_psi;
  }

  return s;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8")) as {
    equipment: CatalogEntry[];
  };

  const all = raw.equipment;
  const entries = all.filter((e) => !isPlaceholder(e) && e.type in TYPE_MAP);

  console.log(
    `\nCatalog: ${all.length} total, ${entries.length} to process (${all.length - entries.length} skipped as placeholders)\n`
  );

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    const dbType = TYPE_MAP[entry.type];
    if (!dbType) {
      console.log(`  SKIP    [${entry.type}] ${entry.model} — no matching DB type`);
      skipped++;
      continue;
    }

    const normalizedModel = normalizeModelSpacing(entry.model);
    const catalogSpecs = buildCatalogSpecs(entry, dbType);

    const existing = await db.query.equipment.findFirst({
      where: and(
        eq(equipment.manufacturer, MANUFACTURER),
        eq(equipment.modelNumber, normalizedModel)
      ),
      columns: { id: true, specs: true },
    });

    if (existing) {
      const mergedSpecs = {
        ...(existing.specs as Record<string, unknown>),
        ...catalogSpecs,
      };
      console.log(`  UPDATE  [${dbType}] ${MANUFACTURER} ${normalizedModel}`);
      if (COMMIT) {
        await db
          .update(equipment)
          .set({ specs: mergedSpecs, updatedAt: new Date() })
          .where(eq(equipment.id, existing.id));
      }
      updated++;
    } else {
      const displayName = `${MANUFACTURER} ${normalizedModel}`;
      console.log(`  INSERT  [${dbType}] ${displayName}`);
      if (COMMIT) {
        await db.insert(equipment).values({
          type: dbType,
          manufacturer: MANUFACTURER,
          modelNumber: normalizedModel,
          displayName,
          specs: catalogSpecs,
          createdBy: "catalog-import",
        });
      }
      inserted++;
    }
  }

  console.log(
    `\nSummary: ${updated} updated, ${inserted} inserted, ${skipped} skipped`
  );
  if (!COMMIT) {
    console.log("Dry run — re-run with --commit to write to the database.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
