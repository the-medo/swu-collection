CREATE TYPE "public"."post_type" AS ENUM('tournament-report', 'profile-description');--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"type" "post_type" NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_author_type_idx" ON "post" USING btree ("author_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "post_profile_author_idx" ON "post" USING btree ("author_id") WHERE "post"."type" = 'profile-description';