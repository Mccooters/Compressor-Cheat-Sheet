import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const equipmentTypeEnum = pgEnum("equipment_type", [
  "compressor",
  "controller",
  "dryer",
  "line_filter",
  "breathing_air",
  "oily_water_separator",
  "vacuum_pump",
  "generator",
  "nitrogen_generator",
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "active",
  "archived",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "manual",
  "datasheet",
  "wiring_diagram",
  "parts_list",
  "photo",
  "other",
]);

export const documentSourceEnum = pgEnum("document_source", [
  "graph",
  "manual_link",
]);

export const faultTreeScopeEnum = pgEnum("fault_tree_scope", [
  "generic",
  "type_scoped",
  "model_scoped",
]);

export const faultTreeStatusEnum = pgEnum("fault_tree_status", [
  "draft",
  "published",
]);

export const faultTreeNodeTypeEnum = pgEnum("fault_tree_node_type", [
  "question",
  "diagnosis",
]);

export const recordSourceEnum = pgEnum("record_source", [
  "manual",
  "sharepoint_sync",
]);

export const equipment = pgTable("equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: equipmentTypeEnum("type").notNull(),
  manufacturer: text("manufacturer").notNull(),
  modelNumber: text("model_number").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  status: equipmentStatusEnum("status").notNull().default("active"),
  specs: jsonb("specs").notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const controller = pgTable(
  "controller",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    manufacturer: text("manufacturer").notNull(),
    modelName: text("model_name").notNull(),
    displayName: text("display_name").notNull(),
    notes: text("notes"),
    source: recordSourceEnum("source").notNull().default("manual"),
    // Set once a Microsoft Lists/SharePoint sync exists — lets a re-sync
    // upsert this row instead of creating a duplicate.
    sharepointListId: text("sharepoint_list_id"),
    sharepointItemId: text("sharepoint_item_id"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("controller_manufacturer_model_idx").on(
      table.manufacturer,
      table.modelName
    ),
  ]
);

export const controllerPassword = pgTable("controller_password", {
  id: uuid("id").defaultRandom().primaryKey(),
  controllerId: uuid("controller_id")
    .notNull()
    .references(() => controller.id, { onDelete: "cascade" }),
  // e.g. "Service", "User", "Factory", "Level 1" — the named access level or
  // procedure this code/instruction unlocks.
  label: text("label").notNull(),
  // The code itself, or free-text button-press instructions when the
  // controller has no numeric password (e.g. "Hold Reset for 5 seconds").
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  source: recordSourceEnum("source").notNull().default("manual"),
  sharepointItemId: text("sharepoint_item_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const documentLink = pgTable("document_link", {
  id: uuid("id").defaultRandom().primaryKey(),
  equipmentId: uuid("equipment_id").references(() => equipment.id, {
    onDelete: "cascade",
  }),
  // A document_link belongs to exactly one of equipment or controller —
  // enforced at the application layer (mirrors how equipmentId itself was
  // already optional rather than a DB-level CHECK constraint).
  controllerId: uuid("controller_id").references(() => controller.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  docType: documentTypeEnum("doc_type").notNull().default("manual"),
  source: documentSourceEnum("source").notNull(),
  sharepointDriveId: text("sharepoint_drive_id"),
  sharepointItemId: text("sharepoint_item_id"),
  webUrl: text("web_url").notNull(),
  fileName: text("file_name"),
  lastModifiedAt: timestamp("last_modified_at", { withTimezone: true }),
  cachedAt: timestamp("cached_at", { withTimezone: true }),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const faultTree = pgTable("fault_tree", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  equipmentScope: faultTreeScopeEnum("equipment_scope")
    .notNull()
    .default("generic"),
  scopedEquipmentType: equipmentTypeEnum("scoped_equipment_type"),
  // No FK constraint here on purpose: fault_tree_node.fault_tree_id already
  // points back at this row, so enforcing both directions would create a
  // circular FK. Root validity (must point at a node belonging to this tree)
  // is checked in the application layer before publishing.
  rootNodeId: uuid("root_node_id"),
  status: faultTreeStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const faultTreeEquipment = pgTable(
  "fault_tree_equipment",
  {
    faultTreeId: uuid("fault_tree_id")
      .notNull()
      .references(() => faultTree.id, { onDelete: "cascade" }),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.faultTreeId, table.equipmentId] })]
);

export const faultTreeNode = pgTable("fault_tree_node", {
  id: uuid("id").defaultRandom().primaryKey(),
  faultTreeId: uuid("fault_tree_id")
    .notNull()
    .references(() => faultTree.id, { onDelete: "cascade" }),
  nodeType: faultTreeNodeTypeEnum("node_type").notNull(),
  prompt: text("prompt").notNull(),
  probableCause: text("probable_cause"),
  recommendedFix: text("recommended_fix"),
  safetyWarning: text("safety_warning"),
  linkedEquipmentId: uuid("linked_equipment_id").references(
    () => equipment.id,
    { onDelete: "set null" }
  ),
  linkedDocumentId: uuid("linked_document_id").references(
    () => documentLink.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const faultTreeBranch = pgTable(
  "fault_tree_branch",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromNodeId: uuid("from_node_id")
      .notNull()
      .references(() => faultTreeNode.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Cascading here too: a branch is meaningless once its destination node
    // is gone, so it should disappear along with either endpoint.
    toNodeId: uuid("to_node_id")
      .notNull()
      .references(() => faultTreeNode.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("fault_tree_branch_from_sort_idx").on(
      table.fromNodeId,
      table.sortOrder
    ),
  ]
);

export const equipmentRelations = relations(equipment, ({ many }) => ({
  documents: many(documentLink),
}));

export const controllerRelations = relations(controller, ({ many }) => ({
  passwords: many(controllerPassword),
  documents: many(documentLink),
}));

export const controllerPasswordRelations = relations(
  controllerPassword,
  ({ one }) => ({
    controller: one(controller, {
      fields: [controllerPassword.controllerId],
      references: [controller.id],
    }),
  })
);

export const documentLinkRelations = relations(documentLink, ({ one }) => ({
  equipment: one(equipment, {
    fields: [documentLink.equipmentId],
    references: [equipment.id],
  }),
  controller: one(controller, {
    fields: [documentLink.controllerId],
    references: [controller.id],
  }),
}));

export const faultTreeRelations = relations(faultTree, ({ many }) => ({
  nodes: many(faultTreeNode),
  equipmentLinks: many(faultTreeEquipment),
}));

export const faultTreeEquipmentRelations = relations(
  faultTreeEquipment,
  ({ one }) => ({
    faultTree: one(faultTree, {
      fields: [faultTreeEquipment.faultTreeId],
      references: [faultTree.id],
    }),
    equipment: one(equipment, {
      fields: [faultTreeEquipment.equipmentId],
      references: [equipment.id],
    }),
  })
);

export const faultTreeNodeRelations = relations(
  faultTreeNode,
  ({ one, many }) => ({
    faultTree: one(faultTree, {
      fields: [faultTreeNode.faultTreeId],
      references: [faultTree.id],
    }),
    linkedEquipment: one(equipment, {
      fields: [faultTreeNode.linkedEquipmentId],
      references: [equipment.id],
    }),
    linkedDocument: one(documentLink, {
      fields: [faultTreeNode.linkedDocumentId],
      references: [documentLink.id],
    }),
    outgoingBranches: many(faultTreeBranch, { relationName: "fromNode" }),
  })
);

export const faultTreeBranchRelations = relations(
  faultTreeBranch,
  ({ one }) => ({
    fromNode: one(faultTreeNode, {
      fields: [faultTreeBranch.fromNodeId],
      references: [faultTreeNode.id],
      relationName: "fromNode",
    }),
    toNode: one(faultTreeNode, {
      fields: [faultTreeBranch.toNodeId],
      references: [faultTreeNode.id],
    }),
  })
);
