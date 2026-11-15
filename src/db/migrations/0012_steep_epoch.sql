ALTER TABLE "aroflo_asset" ADD COLUMN "v2_id" text;--> statement-breakpoint
CREATE INDEX "aroflo_asset_v2_id_idx" ON "aroflo_asset" USING btree ("v2_id");