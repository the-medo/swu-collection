CREATE TABLE "deck_folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" uuid,
	"name" varchar(100) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_folder_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "deck_folder_deck" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"folder_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_folder_share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"audience" varchar(20) NOT NULL,
	"team_id" uuid,
	CONSTRAINT "deck_folder_share_audience_check" CHECK (
      ("deck_folder_share"."audience" = 'link' AND "deck_folder_share"."team_id" IS NULL)
      OR ("deck_folder_share"."audience" = 'team' AND "deck_folder_share"."team_id" IS NOT NULL)
    )
);
--> statement-breakpoint
ALTER TABLE "deck_folder" ADD CONSTRAINT "deck_folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_folder" ADD CONSTRAINT "deck_folder_parent_owner_fk" FOREIGN KEY ("parent_id","user_id") REFERENCES "public"."deck_folder"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_folder_deck" ADD CONSTRAINT "deck_folder_deck_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_folder_deck" ADD CONSTRAINT "deck_folder_deck_folder_id_deck_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."deck_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_folder_share" ADD CONSTRAINT "deck_folder_share_owner_fk" FOREIGN KEY ("folder_id","user_id") REFERENCES "public"."deck_folder"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_folder_share" ADD CONSTRAINT "deck_folder_share_team_member_fk" FOREIGN KEY ("team_id","user_id") REFERENCES "public"."team_member"("team_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_folder_user_parent_idx" ON "deck_folder" USING btree ("user_id","parent_id");--> statement-breakpoint
CREATE INDEX "deck_folder_deck_folder_idx" ON "deck_folder_deck" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deck_folder_share_link_unique" ON "deck_folder_share" USING btree ("folder_id") WHERE "deck_folder_share"."audience" = 'link';--> statement-breakpoint
CREATE UNIQUE INDEX "deck_folder_share_team_unique" ON "deck_folder_share" USING btree ("folder_id","team_id") WHERE "deck_folder_share"."audience" = 'team';--> statement-breakpoint
CREATE INDEX "deck_folder_share_owner_idx" ON "deck_folder_share" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deck_folder_share_team_member_idx" ON "deck_folder_share" USING btree ("team_id","user_id");