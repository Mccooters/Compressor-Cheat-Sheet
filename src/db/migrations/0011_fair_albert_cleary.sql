CREATE TABLE "aroflo_asset" (
	"legacy_asset_id" text PRIMARY KEY NOT NULL,
	"row" jsonb NOT NULL,
	"hash" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "aroflo_asset_changed_at_idx" ON "aroflo_asset" USING btree ("changed_at");