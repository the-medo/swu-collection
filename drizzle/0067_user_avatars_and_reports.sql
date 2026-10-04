CREATE TABLE "user_avatar" (
	"user_id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"side" text NOT NULL,
	"image" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_avatar_side_check" CHECK ("user_avatar"."side" IN ('front', 'back'))
);
--> statement-breakpoint
CREATE TABLE "user_report_action" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_id" uuid NOT NULL,
	"actor_user_id" text,
	"actor_id_at_action" text NOT NULL,
	"actor_display_name" text NOT NULL,
	"target_user_id" text,
	"target_id_at_action" text,
	"target_display_name" text,
	"target" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"report_revision" integer NOT NULL,
	"duration_days" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_report_action_type_check" CHECK ("user_report_action"."action" IN ('dismiss', 'suspend', 'ban', 'restore', 'reopen')),
	CONSTRAINT "user_report_action_reason_check" CHECK (char_length(trim("user_report_action"."reason")) BETWEEN 1 AND 2000),
	CONSTRAINT "user_report_action_target_check" CHECK ("user_report_action"."target" IN ('reported', 'reporter')),
	CONSTRAINT "user_report_action_duration_check" CHECK (("user_report_action"."action" = 'suspend' AND "user_report_action"."duration_days" BETWEEN 1 AND 365 AND "user_report_action"."expires_at" IS NOT NULL) OR ("user_report_action"."action" <> 'suspend' AND "user_report_action"."duration_days" IS NULL AND "user_report_action"."expires_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "user_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" text,
	"reported_user_id" text,
	"reporter_id_at_submission" text,
	"reported_id_at_submission" text,
	"reporter_display_name" text,
	"reported_display_name" text,
	"client_report_id" uuid NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_report_status_check" CHECK ("user_report"."status" IN ('open', 'resolved')),
	CONSTRAINT "user_report_resolution_check" CHECK (("user_report"."status" = 'open' AND "user_report"."resolved_at" IS NULL) OR ("user_report"."status" = 'resolved' AND "user_report"."resolved_at" IS NOT NULL)),
	CONSTRAINT "user_report_description_check" CHECK (char_length(trim("user_report"."description")) BETWEEN 1 AND 2000),
	CONSTRAINT "user_report_source_check" CHECK ("user_report"."source" IN ('profile', 'conversation')),
	CONSTRAINT "user_report_other_user_check" CHECK ("user_report"."reporter_user_id" <> "user_report"."reported_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_avatar" ADD CONSTRAINT "user_avatar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report_action" ADD CONSTRAINT "user_report_action_report_id_user_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."user_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report_action" ADD CONSTRAINT "user_report_action_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report_action" ADD CONSTRAINT "user_report_action_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_report_action_report_idx" ON "user_report_action" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "user_report_action_target_idx" ON "user_report_action" USING btree ("target_id_at_action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_report_request_idx" ON "user_report" USING btree ("reporter_user_id","client_report_id");--> statement-breakpoint
CREATE INDEX "user_report_reporter_time_idx" ON "user_report" USING btree ("reporter_user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_report_target_time_idx" ON "user_report" USING btree ("reported_user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_report_status_time_idx" ON "user_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_report_reporter_snapshot_idx" ON "user_report" USING btree ("reporter_id_at_submission","created_at");--> statement-breakpoint
CREATE INDEX "user_report_reported_snapshot_idx" ON "user_report" USING btree ("reported_id_at_submission","created_at");--> statement-breakpoint
CREATE INDEX "user_report_created_idx" ON "user_report" USING btree ("created_at");