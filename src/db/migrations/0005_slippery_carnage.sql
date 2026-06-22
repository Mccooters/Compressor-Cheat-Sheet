CREATE TABLE "controller_fault_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"controller_id" uuid NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source" "record_source" DEFAULT 'manual' NOT NULL,
	"sharepoint_item_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "controller_fault_code" ADD CONSTRAINT "controller_fault_code_controller_id_controller_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."controller"("id") ON DELETE cascade ON UPDATE no action;