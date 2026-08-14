CREATE TYPE "public"."deck_branch_status" AS ENUM('open', 'merged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."deck_change_request_event_type" AS ENUM('submitted', 'reopened', 'closed', 'merged');--> statement-breakpoint
CREATE TYPE "public"."deck_change_request_status" AS ENUM('open', 'merged', 'closed');--> statement-breakpoint
CREATE TABLE "deck_branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"base_deck_id" uuid NOT NULL,
	"branch_deck_id" uuid NOT NULL,
	"creator_user_id" text NOT NULL,
	"base_snapshot" jsonb NOT NULL,
	"status" "deck_branch_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_branch_branch_deck_id_unique" UNIQUE("branch_deck_id")
);
--> statement-breakpoint
CREATE TABLE "deck_change_request_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_request_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"type" "deck_change_request_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_change_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"base_deck_id" uuid NOT NULL,
	"branch_deck_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "deck_change_request_status" DEFAULT 'open' NOT NULL,
	"merged_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"merged_at" timestamp,
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "deck_branch" ADD CONSTRAINT "deck_branch_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_branch" ADD CONSTRAINT "deck_branch_base_deck_id_deck_id_fk" FOREIGN KEY ("base_deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_branch" ADD CONSTRAINT "deck_branch_branch_deck_id_deck_id_fk" FOREIGN KEY ("branch_deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_branch" ADD CONSTRAINT "deck_branch_creator_user_id_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request_event" ADD CONSTRAINT "deck_change_request_event_change_request_id_deck_change_request_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."deck_change_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request_event" ADD CONSTRAINT "deck_change_request_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request" ADD CONSTRAINT "deck_change_request_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request" ADD CONSTRAINT "deck_change_request_branch_id_deck_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."deck_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request" ADD CONSTRAINT "deck_change_request_base_deck_id_deck_id_fk" FOREIGN KEY ("base_deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request" ADD CONSTRAINT "deck_change_request_branch_deck_id_deck_id_fk" FOREIGN KEY ("branch_deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request" ADD CONSTRAINT "deck_change_request_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_change_request" ADD CONSTRAINT "deck_change_request_merged_by_user_id_user_id_fk" FOREIGN KEY ("merged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_branch-team_id_idx" ON "deck_branch" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "deck_branch-base_deck_id_idx" ON "deck_branch" USING btree ("base_deck_id");--> statement-breakpoint
CREATE INDEX "deck_branch-branch_deck_id_idx" ON "deck_branch" USING btree ("branch_deck_id");--> statement-breakpoint
CREATE INDEX "deck_branch-creator_user_id_idx" ON "deck_branch" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "deck_branch-status_idx" ON "deck_branch" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deck_change_request_event-change_request_id_idx" ON "deck_change_request_event" USING btree ("change_request_id");--> statement-breakpoint
CREATE INDEX "deck_change_request_event-actor_user_id_idx" ON "deck_change_request_event" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "deck_change_request_event-type_idx" ON "deck_change_request_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "deck_change_request-team_id_idx" ON "deck_change_request" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "deck_change_request-branch_id_idx" ON "deck_change_request" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "deck_change_request-base_deck_id_idx" ON "deck_change_request" USING btree ("base_deck_id");--> statement-breakpoint
CREATE INDEX "deck_change_request-branch_deck_id_idx" ON "deck_change_request" USING btree ("branch_deck_id");--> statement-breakpoint
CREATE INDEX "deck_change_request-author_user_id_idx" ON "deck_change_request" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "deck_change_request-status_idx" ON "deck_change_request" USING btree ("status");