CREATE TABLE "card_discussion" (
	"card_id" text PRIMARY KEY NOT NULL,
	"card_name" text NOT NULL,
	"discussion_id" uuid NOT NULL,
	CONSTRAINT "card_discussion_discussion_id_unique" UNIQUE("discussion_id")
);
--> statement-breakpoint
ALTER TABLE "card_discussion" ADD CONSTRAINT "card_discussion_discussion_id_discussion_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussion"("id") ON DELETE cascade ON UPDATE no action;