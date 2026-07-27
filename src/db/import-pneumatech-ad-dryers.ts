import "./load-env";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { equipment } from "@/db/schema";

// Transcribed from the Pneumatech "Technical specifications for AD 10-3000 50Hz"
// datasheet. Flow is quoted at 1 bar(a) / 25 °C ambient, 7 bar(g) operating,
// 35 °C inlet.
const MODELS = [
  { model: "AD 15", flowLs: 6, flowM3Hr: 22, kw: 0.13, supply: "230/50/1", bar: 16, gas: "R513A", conn: '3/4"M', l: 350, w: 493, h: 450, kg: 19 },
  { model: "AD 20", flowLs: 10, flowM3Hr: 36, kw: 0.164, supply: "230/50/1", bar: 16, gas: "R513A", conn: '3/4"M', l: 350, w: 493, h: 450, kg: 19 },
  { model: "AD 30", flowLs: 14, flowM3Hr: 50, kw: 0.19, supply: "230/50/1", bar: 16, gas: "R513A", conn: '3/4"M', l: 350, w: 493, h: 450, kg: 20 },
  { model: "AD 40", flowLs: 20, flowM3Hr: 72, kw: 0.266, supply: "230/50/1", bar: 16, gas: "R513A", conn: '3/4"M', l: 350, w: 493, h: 450, kg: 25 },
  { model: "AD 65", flowLs: 30, flowM3Hr: 108, kw: 0.284, supply: "230/50/1", bar: 16, gas: "R513A", conn: '3/4"M', l: 350, w: 493, h: 450, kg: 27 },
  { model: "AD 85", flowLs: 39, flowM3Hr: 140, kw: 0.674, supply: "230/50/1", bar: 14, gas: "R513A", conn: '1"F', l: 370, w: 497, h: 764, kg: 44 },
  { model: "AD 105", flowLs: 50, flowM3Hr: 180, kw: 0.716, supply: "230/50/1", bar: 14, gas: "R513A", conn: '1"F', l: 370, w: 497, h: 764, kg: 44 },
  { model: "AD 125", flowLs: 60, flowM3Hr: 216, kw: 0.613, supply: "230/50/1", bar: 14, gas: "R410A", conn: '1 1/2"F', l: 460, w: 557, h: 789, kg: 53 },
  { model: "AD 145", flowLs: 68, flowM3Hr: 245, kw: 0.705, supply: "230/50/1", bar: 14, gas: "R410A", conn: '1 1/2"F', l: 460, w: 557, h: 789, kg: 60 },
  { model: "AD 185", flowLs: 87, flowM3Hr: 313, kw: 0.905, supply: "230/50/1", bar: 14, gas: "R410A", conn: '1 1/2"F', l: 460, w: 557, h: 789, kg: 65 },
  { model: "AD 230", flowLs: 108, flowM3Hr: 389, kw: 0.969, supply: "230/50/1", bar: 14, gas: "R410A", conn: '1 1/2"F', l: 580, w: 587, h: 899, kg: 80 },
  { model: "AD 270", flowLs: 128, flowM3Hr: 461, kw: 1.124, supply: "230/50/1", bar: 14, gas: "R410A", conn: '1 1/2"F', l: 580, w: 587, h: 899, kg: 80 },
  { model: "AD 355", flowLs: 167, flowM3Hr: 601, kw: 1.54, supply: "400/50/3", bar: 14, gas: "R410A", conn: '2"F', l: 805, w: 1070, h: 962, kg: 128 },
  { model: "AD 425", flowLs: 200, flowM3Hr: 720, kw: 1.98, supply: "400/50/3", bar: 14, gas: "R410A", conn: '2"F', l: 805, w: 1070, h: 962, kg: 146 },
  { model: "AD 530", flowLs: 250, flowM3Hr: 900, kw: 2.01, supply: "400/50/3", bar: 14, gas: "R410A", conn: '2 1/2"F', l: 805, w: 1070, h: 962, kg: 158 },
  { model: "AD 635", flowLs: 300, flowM3Hr: 1080, kw: 2.77, supply: "400/50/3", bar: 14, gas: "R410A", conn: '2 1/2"F', l: 805, w: 1070, h: 962, kg: 165 },
  { model: "AD 750", flowLs: 400, flowM3Hr: 1440, kw: 3.26, supply: "400/50/3", bar: 14, gas: "R410A", conn: '3"M', l: 1020, w: 1083, h: 1526, kg: 325 },
  { model: "AD 1000", flowLs: 500, flowM3Hr: 1800, kw: 3.89, supply: "400/50/3", bar: 14, gas: "R410A", conn: '3"M', l: 1020, w: 1083, h: 1526, kg: 335 },
  { model: "AD 1250", flowLs: 583.3, flowM3Hr: 2100, kw: 4.75, supply: "400/50/3", bar: 14, gas: "R410A", conn: '3"M', l: 1020, w: 1083, h: 1526, kg: 350 },
  { model: "AD 1600", flowLs: 750, flowM3Hr: 2700, kw: 6.715, supply: "400/50/3", bar: 14, gas: "R410A", conn: "DN 125", l: 1020, w: 1121, h: 1526, kg: 380 },
  { model: "AD 1800", flowLs: 833.3, flowM3Hr: 3000, kw: 6.8, supply: "400/50/3", bar: 14, gas: "R452A", conn: "DN 125", l: 1020, w: 2099, h: 1535, kg: 550 },
  { model: "AD 2500", flowLs: 1166.7, flowM3Hr: 4200, kw: 10.2, supply: "400/50/3", bar: 14, gas: "R452A", conn: "DN 125", l: 1020, w: 2099, h: 1535, kg: 600 },
  { model: "AD 3000", flowLs: 1400, flowM3Hr: 5040, kw: 12.3, supply: "400/50/3", bar: 14, gas: "R452A", conn: "DN 125", l: 1020, w: 2099, h: 1535, kg: 650 },
];

const MANUFACTURER = "Pneumatech";

async function main() {
  let created = 0;
  let updated = 0;

  for (const m of MODELS) {
    const specs = {
      dryerType: "refrigerated",
      flowLs: m.flowLs,
      flowM3Hr: m.flowM3Hr,
      nominalPowerKw: m.kw,
      powerSupply: m.supply,
      maxPressureBar: m.bar,
      refrigerantGas: m.gas,
      connectionSize: m.conn,
      lengthMm: m.l,
      widthMm: m.w,
      heightMm: m.h,
      weightKg: m.kg,
    };

    const existing = await db.query.equipment.findFirst({
      where: and(
        eq(equipment.manufacturer, MANUFACTURER),
        eq(equipment.modelNumber, m.model)
      ),
    });

    if (existing) {
      await db
        .update(equipment)
        .set({ specs, updatedAt: new Date() })
        .where(eq(equipment.id, existing.id));
      updated++;
      console.log(`  ~ ${MANUFACTURER} ${m.model} (updated)`);
      continue;
    }

    await db.insert(equipment).values({
      type: "dryer",
      manufacturer: MANUFACTURER,
      modelNumber: m.model,
      displayName: `${MANUFACTURER} ${m.model}`,
      description: "Refrigerated compressed air dryer, 50 Hz.",
      specs,
    });
    created++;
    console.log(`  + ${MANUFACTURER} ${m.model}`);
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
