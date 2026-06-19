import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  equipment,
  faultTree,
  faultTreeBranch,
  faultTreeNode,
} from "@/db/schema";

async function main() {
  console.log("Seeding equipment...");

  const [compressor] = await db
    .insert(equipment)
    .values({
      type: "compressor",
      manufacturer: "Atlas Copco",
      modelNumber: "GA 30 VSD+",
      displayName: "Atlas Copco GA 30 VSD+",
      description: "Oil-injected rotary screw compressor with variable speed drive.",
      specs: {
        compressorStyle: "rotary_screw",
        driveType: "vsd",
        hp: 40,
        maxPressurePsi: 125,
        ratedCapacityCfm: 150,
        voltage: "460/3/60",
      },
    })
    .returning();

  await db.insert(equipment).values([
    {
      type: "compressor",
      manufacturer: "Ingersoll Rand",
      modelNumber: "R-Series R55",
      displayName: "Ingersoll Rand R-Series R55",
      specs: {
        compressorStyle: "rotary_screw",
        driveType: "fixed_speed",
        hp: 75,
        maxPressurePsi: 125,
        ratedCapacityCfm: 280,
      },
    },
    {
      type: "dryer",
      manufacturer: "Atlas Copco",
      modelNumber: "FD 115",
      displayName: "Atlas Copco FD 115 Refrigerated Dryer",
      specs: {
        dryerType: "refrigerated",
        dewPointF: 38,
        ratedFlowCfm: 115,
        maxInletTempF: 122,
      },
    },
    {
      type: "dryer",
      manufacturer: "SPX Flow",
      modelNumber: "Pneumatic Products DDX150",
      displayName: "Pneumatic Products DDX150 Desiccant Dryer",
      specs: {
        dryerType: "desiccant",
        dewPointF: -40,
        ratedFlowCfm: 150,
      },
    },
    {
      type: "controller",
      manufacturer: "Atlas Copco",
      modelNumber: "Elektronikon Graphic",
      displayName: "Atlas Copco Elektronikon Graphic Controller",
      specs: {
        compatibleWith: "Rotary screw compressors",
        ioCount: 16,
        firmwareVersion: "5.2",
        communicationProtocols: "Modbus, Ethernet/IP",
      },
    },
  ]);

  console.log("Seeding a sample fault tree...");

  const [tree] = await db
    .insert(faultTree)
    .values({
      title: "Compressor won't start",
      description: "Start here when a rotary screw compressor fails to start.",
      equipmentScope: "type_scoped",
      scopedEquipmentType: "compressor",
      status: "draft",
    })
    .returning();

  const [rootNode] = await db
    .insert(faultTreeNode)
    .values({
      faultTreeId: tree.id,
      nodeType: "question",
      prompt: "Does the controller display power on?",
    })
    .returning();

  const [breakerNode] = await db
    .insert(faultTreeNode)
    .values({
      faultTreeId: tree.id,
      nodeType: "question",
      prompt: "Is the main breaker or disconnect tripped?",
    })
    .returning();

  const [breakerDiagnosis] = await db
    .insert(faultTreeNode)
    .values({
      faultTreeId: tree.id,
      nodeType: "diagnosis",
      prompt: "Tripped breaker",
      probableCause: "Main breaker or disconnect has tripped, cutting power to the unit.",
      recommendedFix:
        "Inspect for a short or overload before resetting. Reset the breaker and confirm the unit powers on.",
      safetyWarning: "Lock out/tag out before opening any electrical panel.",
      linkedEquipmentId: compressor.id,
    })
    .returning();

  const [noPowerDiagnosis] = await db
    .insert(faultTreeNode)
    .values({
      faultTreeId: tree.id,
      nodeType: "diagnosis",
      prompt: "No incoming power",
      probableCause: "No incoming power to the unit's disconnect.",
      recommendedFix:
        "Check upstream power supply and building distribution panel. Verify voltage at the disconnect with a meter.",
      safetyWarning: "Lock out/tag out before opening any electrical panel.",
      linkedEquipmentId: compressor.id,
    })
    .returning();

  const [contactorDiagnosis] = await db
    .insert(faultTreeNode)
    .values({
      faultTreeId: tree.id,
      nodeType: "diagnosis",
      prompt: "Failed start contactor",
      probableCause: "Main contactor has failed and is not energizing the motor.",
      recommendedFix:
        "Test contactor coil and contacts. Replace the contactor if it does not pull in when commanded.",
      safetyWarning: "Lock out/tag out before opening any electrical panel.",
      linkedEquipmentId: compressor.id,
    })
    .returning();

  await db.insert(faultTreeBranch).values([
    { fromNodeId: rootNode.id, label: "No, display is blank", toNodeId: breakerNode.id, sortOrder: 0 },
    { fromNodeId: rootNode.id, label: "Yes, display is on", toNodeId: contactorDiagnosis.id, sortOrder: 1 },
    { fromNodeId: breakerNode.id, label: "Yes, it's tripped", toNodeId: breakerDiagnosis.id, sortOrder: 0 },
    { fromNodeId: breakerNode.id, label: "No, breaker is fine", toNodeId: noPowerDiagnosis.id, sortOrder: 1 },
  ]);

  await db
    .update(faultTree)
    .set({ rootNodeId: rootNode.id, status: "published" })
    .where(eq(faultTree.id, tree.id));

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
