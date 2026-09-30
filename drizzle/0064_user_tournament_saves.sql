CREATE TYPE "public"."tournament_save_status" AS ENUM('saved', 'maybe', 'going');--> statement-breakpoint
CREATE TABLE "user_tournament_save" (
	"user_id" text NOT NULL,
	"tournament_id" uuid NOT NULL,
	"status" "tournament_save_status" DEFAULT 'saved' NOT NULL,
	"additional_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tournament_save_user_id_tournament_id_pk" PRIMARY KEY("user_id","tournament_id")
);
--> statement-breakpoint
ALTER TABLE "user_tournament_save" ADD CONSTRAINT "user_tournament_save_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tournament_save" ADD CONSTRAINT "user_tournament_save_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tournament_save_tournament_idx" ON "user_tournament_save" USING btree ("tournament_id");