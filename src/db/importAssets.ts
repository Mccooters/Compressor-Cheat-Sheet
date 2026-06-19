import "./load-env";
import fs from "node:fs";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { equipment } from "./schema";
import { parseSpecs, type EquipmentType } from "@/lib/equipment/specSchemas";

const COMMIT = process.argv.includes("--commit");
const CSV_PATH =
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "/Users/joshuamccarty/Downloads/AllAssets (1).csv";
const REPORT_PATH = "/tmp/equipment-extraction-report.json";

type RawRow = {
  assetName: string;
  orderCode: string;
  customerNote: string;
  status: string;
  assetType: string;
  category: string;
};

const CATEGORY_TO_TYPE: Record<string, string> = {
  "Air Compressor": "compressor",
  "Petrol and Diesel Compressors": "compressor",
  "Air Dryer": "dryer",
  "Line Filters": "line_filter",
  "Breathing Air": "breathing_air",
  "Breathing Air Filter Set": "breathing_air",
  "Oily Water Separator": "oily_water_separator",
  "Vacuum Pumps": "vacuum_pump",
  Generator: "generator",
  "Nitrogen Generator": "nitrogen_generator",
};

const EXCLUDED_CATEGORIES = new Set([
  "Air Receiver",
  "Tools",
  "Pipework Systems",
  "Pressure Gauges",
  "SRV",
  "Other Equipment-Plant",
  "Lube Oil Pumps",
  "Breathing Air Outlet",
  "AroPoint GPS",
]);

const ALL_LABELS = new Set([
  ...Object.keys(CATEGORY_TO_TYPE),
  ...EXCLUDED_CATEGORIES,
]);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

function readRawRows(csvPath: string): RawRow[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r\n|\n/);
  const rows: RawRow[] = [];
  let currentCategory = "";

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('"')) {
      const fields = parseCsvLine(line);
      const [assetName, orderCode, customerNote, status, assetType] = fields;
      if (!assetName) continue;
      rows.push({
        assetName,
        orderCode: orderCode ?? "",
        customerNote: customerNote ?? "",
        status: status ?? "",
        assetType: assetType ?? "",
        category: currentCategory,
      });
    } else if (ALL_LABELS.has(line)) {
      currentCategory = line;
    }
    // else: a customer/site name or continuation line — ignored, we don't track customers.
  }

  return rows;
}

const KNOWN_MANUFACTURERS = [
  "Chicago Pneumatic",
  "CP",
  "Atlas Copco",
  "Ingersoll Rand",
  "Kaeser",
  "Pilot Air",
  "PilotAir",
  "Pilot",
  "Ceccato",
  "Cecatto",
  "Sullair",
  "ELGi",
  "ELGI",
  "Boge",
  "CompAir",
  "Compair",
  "Pneumatech",
  "Pneutech",
  "Pulford",
  "Senator",
  "Fusheng",
  "Champion",
  "Toolex",
  "SMC",
  "Donaldson",
  "Mark",
  "Smartdrive",
  "Walker Filtration",
  "Walker",
  "AAS",
  "Friulair",
  "Frulair",
  "Fruilair",
  "Ultramax",
  "West Air",
  "Westair",
  "Airman",
  "Kaishan",
  "ABAC",
  "Iron Air",
  "Ironair",
  "Airmac",
  "Puma",
  "McMillan",
  "Gardner Denver",
  "Hertz",
  "Sollant",
  "Nardi Pacific",
  "Nardi",
  "Denyo",
  "FS Curtis",
  "Broadbent",
  "Focus Industrial",
  "Focus",
  "GCC",
  "Domnick Hunter",
  "Parker",
  "Quality Air",
  "AU Dryers",
  "Norgren",
  "DVP",
  "Flowserve",
  "Busch",
  "Premier Tech",
  "PDA",
  "Westinghouse",
  "Kryosec",
  "Adicomp",
  "Sepura",
  "JORC",
  "Conquest",
  "National Filters",
  "Lincoln",
  "Etha Filter",
  "Devilbiss Pro",
  "DeVillbiss",
  "Falcon Filtration",
  "Hanke",
  "Bottarini",
  "Hitachi",
  "WESTAIR",
  "Superior",
  "Pneumatic Products",
  "Able Sales",
  "Air-One",
  "Air One",
  "Le Roi",
  "NitroPlus",
  "Formula",
  "Procraft",
  "Genelite",
  "FIAC",
  "Boss",
  "BOSS",
  "Peerless",
  "Risheng",
  "Snap-on",
  "Snap On",
  "Advanced Air",
  "SMAC",
];

const STYLE_KEYWORDS: { pattern: RegExp; value: string }[] = [
  { pattern: /rotary screw/i, value: "rotary_screw" },
  { pattern: /\bscrew\b/i, value: "rotary_screw" },
  { pattern: /\bpiston\b/i, value: "reciprocating" },
  { pattern: /\bscroll\b/i, value: "scroll" },
  { pattern: /centrifugal/i, value: "centrifugal" },
];

const DRYER_TYPE_KEYWORDS: { pattern: RegExp; value: string }[] = [
  { pattern: /refrigerat/i, value: "refrigerated" },
  { pattern: /desiccant|dessicant/i, value: "desiccant" },
  { pattern: /membrane/i, value: "membrane" },
];

const MOUNTING_KEYWORDS: { pattern: RegExp; value: string }[] = [
  { pattern: /integrated|internal/i, value: "integrated" },
  { pattern: /basemount|base mount/i, value: "basemount" },
  { pattern: /external/i, value: "external" },
];

const FILTER_POSITION_KEYWORDS: { pattern: RegExp; value: string }[] = [
  { pattern: /activated carbon|carbon/i, value: "activated_carbon" },
  { pattern: /water separator/i, value: "water_separator" },
  { pattern: /\bpost\b/i, value: "post" },
  { pattern: /\bpre\b|microfilter/i, value: "pre" },
  { pattern: /submicrofilter/i, value: "post" },
];

const TRAILING_KEYWORDS = [
  "Compressor",
  "Screw",
  "Piston",
  "Dryer",
  "Filter",
  "Element",
  "Separator",
  "Pump",
  "Generator",
  "Assembly",
  "Outlet",
  "Set",
  "System",
];

function findKeyword(text: string, table: { pattern: RegExp; value: string }[]) {
  for (const { pattern, value } of table) {
    if (pattern.test(text)) return value;
  }
  return undefined;
}

function isNoiseSegment(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return /^(TBA|TBC|N\/A|NOT IN SERVICE|UNKNOWN|SPARE|DECOMMISSIONED)$/i.test(t);
}

function cutAtTrailingKeyword(text: string): string {
  let cut = text;
  for (const kw of TRAILING_KEYWORDS) {
    const idx = cut.search(new RegExp(`\\b${kw}\\b`, "i"));
    if (idx > 0) {
      cut = cut.slice(0, idx).trim();
      break;
    }
  }
  return cut;
}

// Asset names follow "Manufacturer[ Model] - <serial/site note> - <style> - <drive>"
// but the manufacturer and model are sometimes mashed into that first segment
// (e.g. "Atlas Copco GA18 FF - SN: WUX770686 Workshop - Screw Compressor - E").
// Always locate the manufacturer first, then take whatever immediately follows
// it (within the same segment, before the next dash) as the model — later dash
// segments are serial numbers / site notes / style descriptors, not model info.
function splitManufacturerModel(assetName: string): {
  manufacturer: string;
  modelNumber: string;
  confident: boolean;
} {
  const sorted = [...KNOWN_MANUFACTURERS].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = assetName.match(new RegExp(`\\b${escaped}\\b`, "i"));
    if (!match || match.index === undefined) continue;

    const remainder = assetName
      .slice(match.index + match[0].length)
      .replace(/^\s*[-–:]\s*/, "");
    const parts = remainder
      .split(/\s+[-–]\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let modelNumber = "";
    for (const part of parts) {
      const candidate = cutAtTrailingKeyword(part);
      if (!isNoiseSegment(candidate)) {
        modelNumber = candidate;
        break;
      }
    }

    return {
      manufacturer: normalizeManufacturer(brand),
      modelNumber: modelNumber || "(model unknown)",
      confident: true,
    };
  }

  return { manufacturer: "Unknown", modelNumber: assetName, confident: false };
}

function normalizeManufacturer(raw: string): string {
  const map: Record<string, string> = {
    CP: "Chicago Pneumatic",
    Cecatto: "Ceccato",
    Frulair: "Friulair",
    Fruilair: "Friulair",
    Westair: "West Air",
    WESTAIR: "West Air",
    Ironair: "Iron Air",
    PilotAir: "Pilot Air",
    ELGI: "ELGi",
    Compair: "CompAir",
    DeVillbiss: "Devilbiss Pro",
  };
  return map[raw] ?? raw;
}

type ExtractedEquipment = {
  type: string;
  manufacturer: string;
  modelNumber: string;
  displayName: string;
  specs: Record<string, unknown>;
  occurrences: number;
  confident: boolean;
  samples: string[];
};

function extract(rows: RawRow[]): ExtractedEquipment[] {
  const byKey = new Map<string, ExtractedEquipment>();

  for (const row of rows) {
    if (EXCLUDED_CATEGORIES.has(row.category)) continue;
    const type = CATEGORY_TO_TYPE[row.category];
    if (!type) continue;
    if (/^(TBC|TBA|N\/A| )*$/i.test(row.assetName.trim())) continue;

    const { manufacturer, modelNumber, confident } = splitManufacturerModel(
      row.assetName
    );

    const specs: Record<string, unknown> = {};
    if (type === "compressor") {
      const style = findKeyword(row.assetName, STYLE_KEYWORDS);
      if (style) specs.compressorStyle = style;
      const isEngineDriven =
        row.category === "Petrol and Diesel Compressors" ||
        /engine driven/i.test(row.assetType);
      if (isEngineDriven) {
        specs.powerSource = /petrol/i.test(row.assetName) ? "petrol" : "diesel";
      } else if (/\b-\s*E\s*$/.test(row.assetName) || row.assetType) {
        specs.powerSource = "electric";
      }
    } else if (type === "dryer") {
      const dryerType = findKeyword(row.assetName, DRYER_TYPE_KEYWORDS);
      if (dryerType) specs.dryerType = dryerType;
      const mounting = findKeyword(row.assetName, MOUNTING_KEYWORDS);
      if (mounting) specs.mounting = mounting;
    } else if (type === "line_filter") {
      const position = findKeyword(row.assetName, FILTER_POSITION_KEYWORDS);
      if (position) specs.filterPosition = position;
      if (row.orderCode && /^[A-Z0-9-]+$/i.test(row.orderCode)) {
        specs.elementPartNumber = row.orderCode;
      }
    }

    const key = `${type}::${manufacturer.toLowerCase()}::${modelNumber.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (existing.samples.length < 3) existing.samples.push(row.assetName);
    } else {
      byKey.set(key, {
        type,
        manufacturer,
        modelNumber,
        displayName: `${manufacturer} ${modelNumber}`.trim(),
        specs,
        occurrences: 1,
        confident,
        samples: [row.assetName],
      });
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => b.occurrences - a.occurrences
  );
}

// Small categories: the source data for these is dominated by site-specific
// asset tags (e.g. "AACBAE2502") rather than manufacturer/model identity, so
// algorithmic extraction doesn't work well at this volume — hand-curated
// from reviewing the raw rows directly instead.
const HAND_CURATED: ExtractedEquipment[] = [
  {
    type: "breathing_air",
    manufacturer: "Walker Filtration",
    modelNumber: "BA3022-4-F",
    displayName: "Walker Filtration BA3022-4-F",
    specs: { numberOfStages: 4 },
    occurrences: 1,
    confident: true,
    samples: [],
  },
  {
    type: "breathing_air",
    manufacturer: "Walker Filtration",
    modelNumber: "BA3031-4-F",
    displayName: "Walker Filtration BA3031-4-F",
    specs: { numberOfStages: 4 },
    occurrences: 1,
    confident: true,
    samples: [],
  },
  {
    type: "breathing_air",
    manufacturer: "Pneumatech",
    modelNumber: "4 Stage Alpha 3 BA System",
    displayName: "Pneumatech 4 Stage Alpha 3 BA System",
    specs: { numberOfStages: 4 },
    occurrences: 6,
    confident: true,
    samples: [],
  },
  ...[
    "OWS53",
    "OWS106",
    "OWS360",
    "OWS636",
  ].map((m) => ({
    type: "oily_water_separator",
    manufacturer: "Pneumatech",
    modelNumber: m,
    displayName: `Pneumatech ${m}`,
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  })),
  {
    type: "oily_water_separator",
    manufacturer: "CompAir",
    modelNumber: "CS2600",
    displayName: "CompAir CS2600",
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  },
  {
    type: "oily_water_separator",
    manufacturer: "Atlas Copco",
    modelNumber: "OSC85",
    displayName: "Atlas Copco OSC85",
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  },
  {
    type: "oily_water_separator",
    manufacturer: "Ultramax",
    modelNumber: "NANO S",
    displayName: "Ultramax NANO S",
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  },
  {
    type: "oily_water_separator",
    manufacturer: "Falcon Filtration",
    modelNumber: "WOS20",
    displayName: "Falcon Filtration WOS20",
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  },
  ...["Sepremium 5", "Sepremium 10"].map((m) => ({
    type: "oily_water_separator",
    manufacturer: "JORC",
    modelNumber: m,
    displayName: `JORC ${m}`,
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  })),
  {
    type: "oily_water_separator",
    manufacturer: "Donaldson",
    modelNumber: "Z-54.5-179",
    displayName: "Donaldson Z-54.5-179",
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  },
  {
    type: "vacuum_pump",
    manufacturer: "DVP",
    modelNumber: "LC40",
    displayName: "DVP LC40",
    specs: { vacuumPumpType: "rotary_vane" },
    occurrences: 2,
    confident: true,
    samples: [],
  },
  {
    type: "vacuum_pump",
    manufacturer: "Atlas Copco",
    modelNumber: "GHS 585 VSD+",
    displayName: "Atlas Copco GHS 585 VSD+",
    specs: { vacuumPumpType: "rotary_screw" },
    occurrences: 1,
    confident: true,
    samples: [],
  },
  ...["R5 RB 0021", "R5 RC 0021"].map((m) => ({
    type: "vacuum_pump",
    manufacturer: "Busch",
    modelNumber: m,
    displayName: `Busch ${m}`,
    specs: {},
    occurrences: 1,
    confident: true,
    samples: [],
  })),
  {
    type: "vacuum_pump",
    manufacturer: "Flowserve",
    modelNumber: "LPHR3708",
    displayName: "Flowserve LPHR3708",
    specs: { vacuumPumpType: "liquid_ring" },
    occurrences: 1,
    confident: true,
    samples: [],
  },
  ...["8500E-AS", "2400i", "iGen 4500W"].map((m) => ({
    type: "generator",
    manufacturer: "Westinghouse",
    modelNumber: m,
    displayName: `Westinghouse ${m}`,
    specs: { fuelType: "petrol" },
    occurrences: 1,
    confident: true,
    samples: [],
  })),
  {
    type: "generator",
    manufacturer: "Atlas Copco",
    modelNumber: "QES 20",
    displayName: "Atlas Copco QES 20",
    specs: { fuelType: "diesel" },
    occurrences: 2,
    confident: true,
    samples: [],
  },
  {
    type: "nitrogen_generator",
    manufacturer: "Pneumatech",
    modelNumber: "NitroPlus",
    displayName: "Pneumatech NitroPlus",
    specs: {},
    occurrences: 2,
    confident: true,
    samples: [],
  },
];

function isGoodLineFilter(e: ExtractedEquipment): boolean {
  const knownSet = new Set(KNOWN_MANUFACTURERS.map((m) => normalizeManufacturer(m)));
  const model = e.modelNumber.trim();
  return knownSet.has(e.manufacturer) && model.length >= 3 && /\d/.test(model);
}

function cleanModelNumber(model: string): string {
  return model
    .replace(/\s{2,}/g, " ")
    .replace(/[-–:]\s*$/, "")
    .trim();
}

async function main() {
  const rows = readRawRows(CSV_PATH);
  console.log(`Parsed ${rows.length} data rows from CSV.`);

  const extracted = extract(rows);

  const filtered = extracted.filter((e) => {
    if (e.type === "compressor" || e.type === "dryer") {
      return e.confident;
    }
    if (e.type === "line_filter") {
      return isGoodLineFilter(e);
    }
    // breathing_air, oily_water_separator, vacuum_pump, generator,
    // nitrogen_generator are replaced entirely by HAND_CURATED below.
    return false;
  });

  for (const e of filtered) {
    e.modelNumber = cleanModelNumber(e.modelNumber);
    e.displayName = `${e.manufacturer} ${e.modelNumber}`.trim();
  }

  const finalList = [...filtered, ...HAND_CURATED];

  const byType = new Map<string, number>();
  for (const e of finalList) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
  }
  console.log(`\nFinal import list: ${finalList.length} entries`);
  for (const [type, count] of byType) {
    console.log(`  ${count.toString().padStart(4)}  ${type}`);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(finalList, null, 2));
  console.log(`\nFull final list written to ${REPORT_PATH}`);

  if (COMMIT) {
    console.log("\nClearing placeholder seed equipment...");
    const seedNames = [
      "Atlas Copco GA 30 VSD+",
      "Ingersoll Rand R-Series R55",
      "Atlas Copco FD 115 Refrigerated Dryer",
      "Pneumatic Products DDX150 Desiccant Dryer",
      "Atlas Copco Elektronikon Graphic Controller",
    ];
    await db.delete(equipment).where(inArray(equipment.displayName, seedNames));

    console.log(`Inserting ${finalList.length} equipment entries...`);
    for (const e of finalList) {
      const specs = parseSpecs(e.type as EquipmentType, e.specs);
      await db.insert(equipment).values({
        type: e.type as EquipmentType,
        manufacturer: e.manufacturer,
        modelNumber: e.modelNumber,
        displayName: e.displayName,
        specs,
        createdBy: "csv-import",
      });
    }
    console.log("Done.");
  } else {
    console.log(
      "\nDry run only — re-run with --commit to write these to the database."
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
