import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { controllerFaultCode, controllerPassword } from "@/db/schema";
import { isFaultCodeLabel } from "@/lib/controllers/faultCodeClassifier";

// One-off cleanup for data already imported by import-controller-codes.ts:
// moves controller_password rows whose label is actually a fault/alarm code
// (e.g. "E:0119", "F062", "SR Fault 33") into the new controller_fault_code
// table instead, leaving real access passwords (e.g. "Service", "User")
// where they are. Safe to re-run — once a row has moved, it's gone from
// controller_password so it won't be reconsidered.
async function main() {
  const allPasswords = await db.query.controllerPassword.findMany();
  console.log(`Found ${allPasswords.length} existing controller_password rows.\n`);

  let moved = 0;
  let kept = 0;

  for (const p of allPasswords) {
    if (!isFaultCodeLabel(p.label)) {
      kept++;
      continue;
    }

    await db.insert(controllerFaultCode).values({
      controllerId: p.controllerId,
      code: p.label,
      description: p.value,
      sortOrder: p.sortOrder,
      source: p.source,
    });
    await db.delete(controllerPassword).where(eq(controllerPassword.id, p.id));

    moved++;
    console.log(`  - moved "${p.label}" -> fault code`);
  }

  console.log("\nDone.");
  console.log(`Moved to fault codes: ${moved}`);
  console.log(`Kept as passwords: ${kept}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
