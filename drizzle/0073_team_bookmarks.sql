CREATE TABLE "team_bookmark" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_bookmark" ADD CONSTRAINT "team_bookmark_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_bookmark_team_created_idx" ON "team_bookmark" USING btree ("team_id","created_at");