ALTER TABLE "team_member" ADD COLUMN "auto_add_deck" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "auto_add_deck" boolean DEFAULT true NOT NULL;