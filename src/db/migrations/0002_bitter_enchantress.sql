CREATE TYPE "public"."record_source" AS ENUM('manual', 'sharepoint_sync');--> statement-breakpoint
CREATE TABLE "controller" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manufacturer" text NOT NULL,
	"model_name" text NOT NULL,
	"display_name" text NOT NULL,
	"notes" text,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"sharepoint_list_id" text,
	"sharepoint_item_id" text,
	"last_synced_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controller_password" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"controller_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"sharepoint_item_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "controller_password" ADD CONSTRAINT "controller_password_controller_id_controller_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."controller"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "controller_manufacturer_model_idx" ON "controller" USING btree ("manufacturer","model_name");