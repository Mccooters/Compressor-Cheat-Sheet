import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  controller,
  controllerFaultCode,
  controllerPassword,
  equipment,
  faultTree,
  faultTreeBranch,
  faultTreeNode,
  pviResource,
  resource,
} from "@/db/schema";
import { checkMobileToken, mobileJson } from "@/lib/mobile/auth";
import {
  buildPerformance,
  buildPressureOptions,
  buildSpecs,
} from "@/lib/mobile/specs";
import { buildDocumentUrls } from "@/lib/mobile/urls";

/**
 * Full reference library for the Air Assist iOS app, as one JSON document.
 *
 * The app decodes this strictly — a missing or renamed field fails the whole
 * sync, not just one row — so the shape here is a contract. It is documented
 * in docs/mobile-api.md; change both together, and bump schemaVersion when
 * the change isn't backwards compatible.
 *
 * Auth is the shared bearer token, not a session: this route is excluded
 * from the middleware redirect (see middleware.ts).
 */
export const dynamic = "force-dynamic";

const SCHEMA_VERSION = 2;

type DocumentRow = {
  id: string;
  title: string;
  docType: string;
  source: "graph" | "manual_link";
  sharepointDriveId: string | null;
  sharepointItemId: string | null;
  webUrl: string;
  fileName: string | null;
  lastModifiedAt: Date | null;
};

function toDocument(origin: string, doc: DocumentRow) {
  const { webUrl, browserUrl } = buildDocumentUrls(origin, {
    kind: "document",
    id: doc.id,
    source: doc.source,
    sharepointDriveId: doc.sharepointDriveId,
    sharepointItemId: doc.sharepointItemId,
    webUrl: doc.webUrl,
    lastModifiedAt: doc.lastModifiedAt,
  });

  return {
    id: doc.id,
    title: doc.title,
    docType: doc.docType,
    webUrl,
    browserUrl,
    fileName: doc.fileName,
    lastModifiedAt: doc.lastModifiedAt ? doc.lastModifiedAt.toISOString() : null,
  };
}

export async function GET(request: Request) {
  const denied = checkMobileToken(request);
  if (denied) return denied;

  const origin = new URL(request.url).origin;

  try {
    const [
      equipmentRows,
      controllerRows,
      faultTreeRows,
      resourceRows,
      pviRows,
      equipmentControllerRows,
      faultTreeEquipmentRows,
    ] = await Promise.all([
      // Ordered to match listEquipment()'s default sort.
      db.query.equipment.findMany({
        where: eq(equipment.status, "active"),
        orderBy: [asc(equipment.manufacturer), asc(equipment.modelNumber)],
        with: { documents: true },
      }),
      db.query.controller.findMany({
        orderBy: [asc(controller.manufacturer), asc(controller.modelName)],
        with: {
          passwords: { orderBy: [asc(controllerPassword.sortOrder)] },
          faultCodes: { orderBy: [asc(controllerFaultCode.sortOrder)] },
          documents: true,
        },
      }),
      // Node order matches getTreeWithNodes() so the app walks the tree in
      // the same order the website's wizard does.
      db.query.faultTree.findMany({
        where: eq(faultTree.status, "published"),
        orderBy: [asc(faultTree.title)],
        with: {
          nodes: {
            orderBy: [asc(faultTreeNode.createdAt)],
            with: {
              outgoingBranches: { orderBy: [asc(faultTreeBranch.sortOrder)] },
            },
          },
        },
      }),
      db.query.resource.findMany({ orderBy: [asc(resource.title)] }),
      db.query.pviResource.findMany({ orderBy: [asc(pviResource.createdAt)] }),
      db.query.equipmentController.findMany(),
      db.query.faultTreeEquipment.findMany(),
    ]);

    // Archived equipment is excluded from the snapshot entirely, so links
    // pointing at it must be dropped too — otherwise the app would hold
    // controllerIds/equipmentIds it can't resolve.
    const activeEquipmentIds = new Set(equipmentRows.map((row) => row.id));

    const controllerIdsByEquipment = new Map<string, string[]>();
    const equipmentIdsByController = new Map<string, string[]>();
    for (const link of equipmentControllerRows) {
      if (!activeEquipmentIds.has(link.equipmentId)) continue;
      const forEquipment = controllerIdsByEquipment.get(link.equipmentId) ?? [];
      forEquipment.push(link.controllerId);
      controllerIdsByEquipment.set(link.equipmentId, forEquipment);

      const forController = equipmentIdsByController.get(link.controllerId) ?? [];
      forController.push(link.equipmentId);
      equipmentIdsByController.set(link.controllerId, forController);
    }

    const equipmentIdsByFaultTree = new Map<string, string[]>();
    for (const link of faultTreeEquipmentRows) {
      if (!activeEquipmentIds.has(link.equipmentId)) continue;
      const list = equipmentIdsByFaultTree.get(link.faultTreeId) ?? [];
      list.push(link.equipmentId);
      equipmentIdsByFaultTree.set(link.faultTreeId, list);
    }

    return mobileJson({
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),

      equipment: equipmentRows.map((row) => {
        const specs = (row.specs as Record<string, unknown>) ?? {};
        return {
          id: row.id,
          type: row.type,
          manufacturer: row.manufacturer,
          modelNumber: row.modelNumber,
          displayName: row.displayName,
          details: row.description,
          specs: buildSpecs(row.type, specs),
          performance: buildPerformance(specs),
          pressureOptions: buildPressureOptions(specs),
          controllerIds: controllerIdsByEquipment.get(row.id) ?? [],
          documents: row.documents.map((doc) => toDocument(origin, doc)),
        };
      }),

      controllers: controllerRows.map((row) => ({
        id: row.id,
        manufacturer: row.manufacturer,
        modelName: row.modelName,
        displayName: row.displayName,
        notes: row.notes,
        passwords: row.passwords.map((p) => ({
          id: p.id,
          label: p.label,
          value: p.value,
        })),
        faultCodes: row.faultCodes.map((f) => ({
          id: f.id,
          code: f.code,
          detail: f.description,
        })),
        equipmentIds: equipmentIdsByController.get(row.id) ?? [],
        documents: row.documents.map((doc) => toDocument(origin, doc)),
      })),

      faultTrees: faultTreeRows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.description,
        category: row.category,
        equipmentScope: row.equipmentScope,
        scopedEquipmentType: row.scopedEquipmentType,
        equipmentIds: equipmentIdsByFaultTree.get(row.id) ?? [],
        rootNodeId: row.rootNodeId,
        nodes: row.nodes.map((node) => ({
          id: node.id,
          nodeType: node.nodeType,
          prompt: node.prompt,
          probableCause: node.probableCause,
          recommendedFix: node.recommendedFix,
          safetyWarning: node.safetyWarning,
          linkedEquipmentId: node.linkedEquipmentId,
          linkedDocumentId: node.linkedDocumentId,
          branches: node.outgoingBranches.map((branch) => ({
            id: branch.id,
            label: branch.label,
            toNodeId: branch.toNodeId,
          })),
        })),
      })),

      resources: [
        ...resourceRows.map((row) => {
          const { webUrl, browserUrl } = buildDocumentUrls(origin, {
            kind: "resource",
            id: row.id,
            source: row.source,
            sharepointDriveId: row.sharepointDriveId,
            sharepointItemId: row.sharepointItemId,
            webUrl: row.webUrl,
          });
          return {
            id: row.id,
            area: row.area,
            title: row.title,
            category: row.category,
            webUrl,
            browserUrl,
            fileName: row.fileName,
          };
        }),
        // pvi_resource predates the shared `resource` table and has no area
        // column of its own; it is always the Pressure Vessel Inspection page.
        ...pviRows.map((row) => {
          const { webUrl, browserUrl } = buildDocumentUrls(origin, {
            kind: "pvi",
            id: row.id,
            source: row.source,
            sharepointDriveId: row.sharepointDriveId,
            sharepointItemId: row.sharepointItemId,
            webUrl: row.webUrl,
          });
          return {
            id: row.id,
            area: "pressure_vessel_inspection",
            title: row.title,
            category: row.category,
            webUrl,
            browserUrl,
            fileName: row.fileName,
          };
        }),
      ],
    });
  } catch (err) {
    console.error("Failed to build mobile snapshot:", err);
    return mobileJson({ error: "Failed to build snapshot" }, 500);
  }
}
