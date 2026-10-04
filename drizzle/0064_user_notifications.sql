CREATE TABLE "user_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text NOT NULL,
	"actor_user_id" text,
	"type" varchar(80) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" text NOT NULL,
	"data" jsonb DEFAULT '{"version":1}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"first_read_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_dedupe_idx" ON "user_notification" USING btree ("recipient_user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "user_notification_inbox_idx" ON "user_notification" USING btree ("recipient_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_notification_unread_idx" ON "user_notification" USING btree ("recipient_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "user_notification"."read_at" IS NULL AND "user_notification"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_notification_entity_idx" ON "user_notification" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "user_notification_actor_idx" ON "user_notification" USING btree ("actor_user_id");