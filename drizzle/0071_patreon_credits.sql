CREATE TABLE "patreon_connection" (
	"client_id" text PRIMARY KEY NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"expires_at" timestamp with time zone,
	"campaign_id" text,
	"currency" text,
	"last_sync_at" timestamp with time zone,
	"last_sync_skipped" integer DEFAULT 0 NOT NULL,
	"last_webhook_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patreon_member" (
	"campaign_id" text NOT NULL,
	"member_id" text NOT NULL,
	"user_id" text,
	"email" text,
	"name" text,
	"patron_status" text,
	"last_charge_at" timestamp with time zone,
	"last_charge_status" text,
	"lifetime_cents" bigint,
	"credited_cents" bigint DEFAULT 0 NOT NULL,
	"review_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"observed_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "patreon_member_campaign_id_member_id_pk" PRIMARY KEY("campaign_id","member_id"),
	CONSTRAINT "patreon_member_credited_cents_check" CHECK ("patreon_member"."credited_cents" >= 0 AND "patreon_member"."credited_cents" <= 900719925474099),
	CONSTRAINT "patreon_member_lifetime_cents_check" CHECK ("patreon_member"."lifetime_cents" >= 0 AND "patreon_member"."lifetime_cents" <= 900719925474099)
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"source" text NOT NULL,
	"source_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_credits_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "user_credits_amount_check" CHECK ("user_credits"."amount" != 0 AND "user_credits"."amount" BETWEEN -9007199254740991 AND 9007199254740991)
);
--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_total_support_check";--> statement-breakpoint
ALTER TABLE "patreon_member" ADD CONSTRAINT "patreon_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patreon_member" ADD CONSTRAINT "patreon_member_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patreon_member_email_idx" ON "patreon_member" USING btree ("email");--> statement-breakpoint
CREATE INDEX "patreon_member_user_idx" ON "patreon_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_credits_user_created_idx" ON "user_credits" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_verified_normalized_email_idx" ON "user" USING btree (lower(btrim("email"))) WHERE "user"."email_verified" = true;--> statement-breakpoint
ALTER TABLE "user_profile" DROP COLUMN "total_support";--> statement-breakpoint
ALTER TABLE "user_profile" DROP COLUMN "active_supporter";