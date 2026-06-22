import "./load-env";
import { readFileSync } from "fs";
import { and, ilike } from "drizzle-orm";
import { db } from "@/db";
import { controller, controllerFaultCode, controllerPassword } from "@/db/schema";
import { isFaultCodeLabel } from "@/lib/controllers/faultCodeClassifier";

type ScrapedDoc = { label: string; url_rel: string; url: string; local_path: string };

type ScrapedRecord = {
  manufacturer: string;
  manufacturer_num: string;
  model: string;
  photo_url: string;
  photo_local_path: string;
  codes: Record<string, string>;
  code_order: string[];
  docs: ScrapedDoc[];
};

async function main() {
  const raw = readFileSync("scraped-data/controllers.json", "utf-8");
  const records: ScrapedRecord[] = JSON.parse(raw);

  console.log(`Loaded ${records.length} scraped controller records.\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let passwordsInserted = 0;
  let faultCodesInserted = 0;

  for (const r of records) {
    try {
      const existing = await db.query.controller.findFirst({
        where: and(
          ilike(controller.manufacturer, r.manufacturer),
          ilike(controller.modelName, r.model)
        ),
      });

      if (existing) {
        skipped++;
        console.log(`  - ${r.manufacturer} ${r.model} (already exists, skipping)`);
        continue;
      }

      const [row] = await db
        .insert(controller)
        .values({
          manufacturer: r.manufacturer,
          modelName: r.model,
          displayName: `${r.manufacturer} ${r.model}`,
          source: "manual",
        })
        .returning();

      const entries = r.code_order
        .map((label, i) => ({ label, value: (r.codes[label] ?? "").trim(), sortOrder: i }))
        .filter((p) => p.value !== "");

      const passwordRows = entries.filter((e) => !isFaultCodeLabel(e.label));
      const faultCodeRows = entries.filter((e) => isFaultCodeLabel(e.label));

      if (passwordRows.length > 0) {
        await db.insert(controllerPassword).values(
          passwordRows.map((p) => ({
            controllerId: row.id,
            label: p.label,
            value: p.value,
            sortOrder: p.sortOrder,
          }))
        );
        passwordsInserted += passwordRows.length;
      }

      if (faultCodeRows.length > 0) {
        await db.insert(controllerFaultCode).values(
          faultCodeRows.map((f) => ({
            controllerId: row.id,
            code: f.label,
            description: f.value,
            sortOrder: f.sortOrder,
          }))
        );
        faultCodesInserted += faultCodeRows.length;
      }

      created++;
      console.log(
        `  - ${r.manufacturer} ${r.model} (${passwordRows.length} codes, ${faultCodeRows.length} fault codes)`
      );
    } catch (err) {
      failed++;
      console.error(
        `  ! FAILED on ${r.manufacturer} ${r.model}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log("\nDone.");
  console.log(`Created: ${created}`);
  console.log(`Skipped (already existed): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Password codes inserted: ${passwordsInserted}`);
  console.log(`Fault codes inserted: ${faultCodesInserted}`);
  console.log(
    "\nPhotos and manuals were NOT linked yet. Upload the organized files in " +
      "scraped-data/for-sharepoint/ to SharePoint, then add each link from the " +
      "controller's edit page (Photo & manuals panel) — paste the SharePoint " +
      "share URL, or use the SharePoint search picker if Graph is configured."
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
