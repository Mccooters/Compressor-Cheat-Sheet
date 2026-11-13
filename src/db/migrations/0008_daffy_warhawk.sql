CREATE TABLE "aroflo_sync_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_tag" (
	"tag_id" text PRIMARY KEY NOT NULL,
	"aroflo_asset_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
