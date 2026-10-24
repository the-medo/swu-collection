CREATE TABLE "creator_claimed_deck" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_oauth_state" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_oauth_state" ADD COLUMN "purpose" text DEFAULT 'connect' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_oauth_state" ADD COLUMN "pending_connection" text;--> statement-breakpoint
ALTER TABLE "creator_claimed_deck" ADD CONSTRAINT "creator_claimed_deck_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;