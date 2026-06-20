import "./load-env";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { controller, controllerPassword } from "./schema";

const COMMIT = process.argv.includes("--commit");

type PasswordEntry = { label: string; value: string };
type ControllerEntry = {
  manufacturer: string;
  modelName: string;
  notes?: string;
  passwords: PasswordEntry[];
};

// Hand-transcribed from Controllers.pdf — sample batch (ABAC, Almig, Atlas
// Copco) for review before transcribing the rest of the document.
const CONTROLLERS: ControllerEntry[] = [
  {
    manufacturer: "ABAC",
    modelName: "MC2",
    passwords: [
      {
        label: "Password",
        value: "Hold up arrow, minus and reset together for three seconds.",
      },
    ],
  },
  {
    manufacturer: "Almig",
    modelName: "Air Control 1",
    passwords: [
      { label: "Maintenance Reset", value: "0021" },
      { label: "Master", value: "1923" },
    ],
  },
  {
    manufacturer: "Almig",
    modelName: "Air Control 2",
    passwords: [
      { label: "Maintenance Reset", value: "0021" },
      { label: "Master", value: "1923" },
    ],
  },
  {
    manufacturer: "Almig",
    modelName: "Air Control 3",
    passwords: [{ label: "Master", value: "03846" }],
  },
  {
    manufacturer: "Almig",
    modelName: "Air Control mini",
    passwords: [{ label: "Customer", value: "1" }],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "BASE",
    passwords: [
      {
        label: "Service Timer",
        value:
          'Press enter for 3 seconds from Main Menu to enter submenus dAtA (Data) <d.1> Running Hours <d.2> Motor Starts <d.3> Module Hours <d.4> Loading Hours <d.5> Load Solenoid <d.6> Service Timer. Hold enter for 3 seconds and "PASS" comes up. Enter 9989 and enter. RESN comes up, press up once to RESY and hit enter. Screen will flash and timer has been reset.',
      },
      { label: "Setup", value: "9888" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "DC-1 Dryer",
    passwords: [{ label: "Master Password", value: "4321" }],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "Elektronikon MK3",
    passwords: [
      { label: "Auto Restart", value: "4735" },
      { label: "DSS Function", value: "8244" },
      { label: "Modify Hours", value: "1807" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "Elektronikon MK4",
    passwords: [
      { label: "Auto Restart", value: "4735" },
      { label: "DSS Function", value: "8244" },
      { label: "Full Access", value: "2801" },
      { label: "Modify Hours", value: "1807" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "Elektronikon MK5 Graphic",
    passwords: [
      { label: "Auto Restart", value: "4735" },
      { label: "User", value: "2801" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "Elektronikon MK5 Graphic Plus",
    passwords: [
      { label: "Auto Restart", value: "4735" },
      { label: "Hidden Menu", value: "Enter 2801 in the Access menu." },
      { label: "Regrease", value: "1807" },
      { label: "Service", value: "1304" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "Elektronikon MK5 Swipe",
    passwords: [
      { label: "Auto Restart", value: "4735" },
      { label: "Full Access", value: "2801" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "Elektronikon MK5 Touch",
    passwords: [
      { label: "Auto Restart", value: "4735" },
      { label: "User", value: "2801" },
    ],
  },
  {
    manufacturer: "Atlas Copco",
    modelName: "MK5 Modbus Gateway",
    passwords: [
      { label: "Baud Rate", value: "5972" },
      { label: "Settings", value: "9642" },
    ],
  },
];

async function main() {
  console.log(`Parsed ${CONTROLLERS.length} controller entries.`);

  let inserted = 0;
  let skipped = 0;

  for (const entry of CONTROLLERS) {
    const existing = await db.query.controller.findFirst({
      where: and(
        eq(controller.manufacturer, entry.manufacturer),
        eq(controller.modelName, entry.modelName)
      ),
    });
    if (existing) {
      console.log(`  SKIP (exists): ${entry.manufacturer} ${entry.modelName}`);
      skipped++;
      continue;
    }

    inserted++;
    console.log(
      `  ${COMMIT ? "INSERT" : "WOULD INSERT"}: ${entry.manufacturer} ${entry.modelName} (${entry.passwords.length} codes)`
    );

    if (COMMIT) {
      const [created] = await db
        .insert(controller)
        .values({
          manufacturer: entry.manufacturer,
          modelName: entry.modelName,
          displayName: `${entry.manufacturer} ${entry.modelName}`,
          notes: entry.notes,
          createdBy: "pdf-import",
        })
        .returning({ id: controller.id });

      for (const [i, p] of entry.passwords.entries()) {
        await db.insert(controllerPassword).values({
          controllerId: created.id,
          label: p.label,
          value: p.value,
          sortOrder: i,
        });
      }
    }
  }

  console.log(`\n${inserted} ${COMMIT ? "inserted" : "to insert"}, ${skipped} skipped (already exist).`);
  if (!COMMIT) {
    console.log("Dry run only — re-run with --commit to write these to the database.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
