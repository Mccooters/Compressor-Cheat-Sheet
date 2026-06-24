CREATE TYPE "public"."fault_tree_category" AS ENUM('electrical', 'mechanical', 'lubrication', 'controls', 'safety', 'moisture');--> statement-breakpoint
CREATE TYPE "public"."pvi_resource_category" AS ENUM('cheat_sheet', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_area" AS ENUM('breathing_air', 'swms', 'installations');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pvi_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" "pvi_resource_category" DEFAULT 'other' NOT NULL,
	"source" "document_source" NOT NULL,
	"sharepoint_drive_id" text,
	"sharepoint_item_id" text,
	"web_url" text NOT NULL,
	"file_name" text,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "resource_area" NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"source" "document_source" NOT NULL,
	"sharepoint_drive_id" text,
	"sharepoint_item_id" text,
	"web_url" text NOT NULL,
	"file_name" text,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fault_tree" ADD COLUMN "category" "fault_tree_category" DEFAULT 'mechanical' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_email_idx" ON "app_user" USING btree ("email");