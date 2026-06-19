CREATE TYPE "public"."document_source" AS ENUM('graph', 'manual_link');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('manual', 'datasheet', 'wiring_diagram', 'parts_list', 'other');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."equipment_type" AS ENUM('compressor', 'controller', 'dryer');--> statement-breakpoint
CREATE TYPE "public"."fault_tree_node_type" AS ENUM('question', 'diagnosis');--> statement-breakpoint
CREATE TYPE "public"."fault_tree_scope" AS ENUM('generic', 'type_scoped', 'model_scoped');--> statement-breakpoint
CREATE TYPE "public"."fault_tree_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "document_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid,
	"title" text NOT NULL,
	"doc_type" "document_type" DEFAULT 'manual' NOT NULL,
	"source" "document_source" NOT NULL,
	"sharepoint_drive_id" text,
	"sharepoint_item_id" text,
	"web_url" text NOT NULL,
	"file_name" text,
	"last_modified_at" timestamp with time zone,
	"cached_at" timestamp with time zone,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "equipment_type" NOT NULL,
	"manufacturer" text NOT NULL,
	"model_number" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"status" "equipment_status" DEFAULT 'active' NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fault_tree" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"equipment_scope" "fault_tree_scope" DEFAULT 'generic' NOT NULL,
	"scoped_equipment_type" "equipment_type",
	"root_node_id" uuid,
	"status" "fault_tree_status" DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fault_tree_branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_node_id" uuid NOT NULL,
	"label" text NOT NULL,
	"to_node_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fault_tree_equipment" (
	"fault_tree_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	CONSTRAINT "fault_tree_equipment_fault_tree_id_equipment_id_pk" PRIMARY KEY("fault_tree_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "fault_tree_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fault_tree_id" uuid NOT NULL,
	"node_type" "fault_tree_node_type" NOT NULL,
	"prompt" text NOT NULL,
	"probable_cause" text,
	"recommended_fix" text,
	"safety_warning" text,
	"linked_equipment_id" uuid,
	"linked_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_link" ADD CONSTRAINT "document_link_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_branch" ADD CONSTRAINT "fault_tree_branch_from_node_id_fault_tree_node_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."fault_tree_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_branch" ADD CONSTRAINT "fault_tree_branch_to_node_id_fault_tree_node_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."fault_tree_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_equipment" ADD CONSTRAINT "fault_tree_equipment_fault_tree_id_fault_tree_id_fk" FOREIGN KEY ("fault_tree_id") REFERENCES "public"."fault_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_equipment" ADD CONSTRAINT "fault_tree_equipment_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_node" ADD CONSTRAINT "fault_tree_node_fault_tree_id_fault_tree_id_fk" FOREIGN KEY ("fault_tree_id") REFERENCES "public"."fault_tree"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_node" ADD CONSTRAINT "fault_tree_node_linked_equipment_id_equipment_id_fk" FOREIGN KEY ("linked_equipment_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fault_tree_node" ADD CONSTRAINT "fault_tree_node_linked_document_id_document_link_id_fk" FOREIGN KEY ("linked_document_id") REFERENCES "public"."document_link"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fault_tree_branch_from_sort_idx" ON "fault_tree_branch" USING btree ("from_node_id","sort_order");