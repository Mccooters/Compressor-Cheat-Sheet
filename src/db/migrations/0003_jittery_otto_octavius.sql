ALTER TYPE "public"."document_type" ADD VALUE 'photo' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "document_link" ADD COLUMN "controller_id" uuid;--> statement-breakpoint
ALTER TABLE "document_link" ADD CONSTRAINT "document_link_controller_id_controller_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."controller"("id") ON DELETE cascade ON UPDATE no action;