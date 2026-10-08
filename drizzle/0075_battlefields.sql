CREATE TABLE "battlefield_preset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scene" jsonb NOT NULL,
	"factions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "battlefield_preset_revision_check" CHECK ("battlefield_preset"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "battlefield" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"scene" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "battlefield_revision_check" CHECK ("battlefield"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "battlefield_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "battlefield" ADD CONSTRAINT "battlefield_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battlefield_preset_created_idx" ON "battlefield_preset" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "battlefield_preset_factions_idx" ON "battlefield_preset" USING gin ("factions");--> statement-breakpoint
CREATE INDEX "battlefield_user_idx" ON "battlefield" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battlefield_active_user_idx" ON "battlefield" USING btree ("user_id") WHERE "battlefield"."active" = true;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_battlefield_limit_check" CHECK ("user_profile"."battlefield_limit" >= 1 AND "user_profile"."battlefield_limit" <= 100);