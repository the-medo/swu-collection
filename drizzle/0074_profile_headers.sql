CREATE TABLE "image_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"image_key" text NOT NULL,
	"thumbnail_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_gallery_dimensions_check" CHECK ("image_gallery"."width" > 0 AND "image_gallery"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "team_header" (
	"team_id" uuid PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"image_key" text NOT NULL,
	"file_id" uuid,
	"gallery_image_id" uuid,
	"left" integer NOT NULL,
	"top" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_source" text DEFAULT 'battlefield' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_image_key" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_file_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_gallery_image_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_left" integer;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_top" integer;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_width" integer;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "header_height" integer;--> statement-breakpoint
ALTER TABLE "team_header" ADD CONSTRAINT "team_header_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_gallery_created_idx" ON "image_gallery" USING btree ("created_at","id");