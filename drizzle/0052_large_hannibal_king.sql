CREATE TABLE "discord_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_type" varchar(120) NOT NULL,
	"scope_type" varchar(80) NOT NULL,
	"scope_id" text,
	"scope_key" text NOT NULL,
	"discord_channel_id" text NOT NULL,
	"discord_message_id" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error" text,
	"payload" jsonb,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "discord_notification_scope_uidx" ON "discord_notification" USING btree ("notification_type","scope_key");--> statement-breakpoint
CREATE INDEX "discord_notification_scope_idx" ON "discord_notification" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "discord_notification_status_idx" ON "discord_notification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discord_notification_sent_at_idx" ON "discord_notification" USING btree ("sent_at");