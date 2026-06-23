import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { faultTree } from "@/db/schema";

// One-off fix-up for fault trees already seeded before the category column
// existed (they all landed on the schema default, "mechanical"). Maps each
// known title to its correct category; anything not in this list is left
// alone and reported so it can be set manually via the admin edit page.
const TITLE_TO_CATEGORY: Record<string, string> = {
  "Compressor won't start": "electrical",
  "Compressor trips on motor overload / high current draw": "electrical",
  "Won't build or reach discharge pressure": "mechanical",
  "High discharge/sump temperature or thermal shutdown": "lubrication",
  "Excessive oil carryover into the air system": "lubrication",
  "Runs but won't load (no output)": "controls",
  "Cycles (starts/stops or loads/unloads) too frequently": "controls",
  "Low oil pressure / lubrication alarm": "lubrication",
  "Abnormal noise or vibration": "mechanical",
  "VSD/inverter fault trip": "electrical",
  "High air/oil separator differential pressure": "lubrication",
  "Won't start — no response to the start command": "electrical",
  "Contactor closes but motor hums, won't turn, or trips instantly": "electrical",
  "Wrong rotation direction after rewiring or a supply change": "electrical",
  "Condensate drain not working correctly": "moisture",
  "Pressure relief/safety valve lifts or won't reseat": "safety",
  "Controller display frozen, unresponsive, or showing incorrect data": "electrical",
  "Oil leaking externally from the unit": "lubrication",
  "Runs continuously loaded and never unloads": "controls",
  "Blowdown (sump vent) valve fault": "mechanical",
  "Oil appears milky or water-contaminated": "lubrication",
};

async function main() {
  const trees = await db.query.faultTree.findMany();
  console.log(`Found ${trees.length} fault trees.\n`);

  let updated = 0;
  let skipped = 0;

  for (const tree of trees) {
    const category = TITLE_TO_CATEGORY[tree.title];
    if (!category) {
      skipped++;
      console.log(`  - "${tree.title}" (no known mapping, leaving as "${tree.category}")`);
      continue;
    }
    if (tree.category === category) {
      continue;
    }

    await db
      .update(faultTree)
      .set({ category: category as typeof tree.category })
      .where(eq(faultTree.id, tree.id));
    updated++;
    console.log(`  - "${tree.title}" -> ${category}`);
  }

  console.log("\nDone.");
  console.log(`Updated: ${updated}`);
  console.log(`Left as-is (no mapping or already correct): ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
