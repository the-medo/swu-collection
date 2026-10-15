CREATE TABLE "user_album" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'unlisted' NOT NULL,
	"cover_file_id" uuid,
	"tournament_id" uuid,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_album_tournament_public_check" CHECK ("user_album"."tournament_id" IS NULL OR "user_album"."visibility" = 'public'),
	CONSTRAINT "user_album_visibility_check" CHECK ("user_album"."visibility" IN ('private', 'unlisted', 'public')),
	CONSTRAINT "user_album_title_check" CHECK (length(btrim("user_album"."title")) BETWEEN 1 AND 120),
	CONSTRAINT "user_album_description_check" CHECK (length("user_album"."description") <= 2000),
	CONSTRAINT "user_album_revision_check" CHECK ("user_album"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_album_item" (
	"album_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	CONSTRAINT "user_album_item_album_id_file_id_pk" PRIMARY KEY("album_id","file_id"),
	CONSTRAINT "user_album_item_position_check" CHECK ("user_album_item"."position" >= 0),
	CONSTRAINT "user_album_item_text_check" CHECK (length("user_album_item"."caption") <= 500 AND length("user_album_item"."alt_text") <= 300)
);
--> statement-breakpoint
ALTER TABLE "user_album" ADD CONSTRAINT "user_album_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_album" ADD CONSTRAINT "user_album_cover_file_id_user_file_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."user_file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_album" ADD CONSTRAINT "user_album_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_album_item" ADD CONSTRAINT "user_album_item_album_id_user_album_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."user_album"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_album_item" ADD CONSTRAINT "user_album_item_file_id_user_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."user_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_album_owner_created_idx" ON "user_album" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "user_album_public_created_idx" ON "user_album" USING btree ("user_id","created_at","id") WHERE "user_album"."visibility" = 'public';--> statement-breakpoint
CREATE INDEX "user_album_tournament_created_idx" ON "user_album" USING btree ("tournament_id","created_at","id") WHERE "user_album"."tournament_id" IS NOT NULL AND "user_album"."visibility" = 'public';--> statement-breakpoint
CREATE INDEX "user_album_cover_idx" ON "user_album" USING btree ("cover_file_id");--> statement-breakpoint
CREATE INDEX "user_album_item_order_idx" ON "user_album_item" USING btree ("album_id","position","file_id");--> statement-breakpoint
CREATE INDEX "user_album_item_file_idx" ON "user_album_item" USING btree ("file_id");