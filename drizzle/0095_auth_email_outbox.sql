CREATE TABLE "auth_email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_hash" text NOT NULL,
	"kind" text NOT NULL,
	"payload" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "auth_email_outbox_pending_idx" ON "auth_email_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "auth_email_outbox_recipient_idx" ON "auth_email_outbox" USING btree ("recipient_hash","created_at");