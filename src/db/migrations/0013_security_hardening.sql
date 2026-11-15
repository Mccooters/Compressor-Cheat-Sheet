ALTER TYPE "public"."user_role" ADD VALUE 'pending';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'staff';--> statement-breakpoint
CREATE TABLE "mobile_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mobile_token_hash_idx" ON "mobile_token" USING btree ("token_hash");