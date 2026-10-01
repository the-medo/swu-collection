ALTER TABLE "tournament" ADD COLUMN "coordinates" "point";--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "additional_info" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE TABLE "event_highlight" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"image_url" text NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "event_highlight_date_idx" ON "event_highlight" USING btree ("date");
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TYPE "public"."tournament_attachment_category" AS ENUM('travel', 'accommodation', 'ticket', 'other');--> statement-breakpoint
CREATE TYPE "public"."tournament_attachment_kind" AS ENUM('file', 'text', 'link');--> statement-breakpoint
CREATE TYPE "public"."tournament_preparation_status" AS ENUM('yes', 'no', 'not_needed');--> statement-breakpoint
CREATE TABLE "user_tournament_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tournament_id" uuid NOT NULL,
	"category" "tournament_attachment_category" NOT NULL,
	"kind" "tournament_attachment_kind" NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"object_key" text,
	"file_name" text,
	"mime_type" text,
	"byte_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tournament_attachment_payload_check" CHECK ((
    ("user_tournament_attachment"."kind" = 'file' AND "user_tournament_attachment"."object_key" IS NOT NULL AND "user_tournament_attachment"."file_name" IS NOT NULL AND "user_tournament_attachment"."mime_type" IS NOT NULL AND "user_tournament_attachment"."byte_size" > 0 AND "user_tournament_attachment"."content" IS NULL)
    OR ("user_tournament_attachment"."kind" IN ('text', 'link') AND "user_tournament_attachment"."content" IS NOT NULL AND "user_tournament_attachment"."object_key" IS NULL AND "user_tournament_attachment"."file_name" IS NULL AND "user_tournament_attachment"."mime_type" IS NULL AND "user_tournament_attachment"."byte_size" IS NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "user_tournament_preparation" (
	"user_id" text NOT NULL,
	"tournament_id" uuid NOT NULL,
	"category" "tournament_attachment_category" NOT NULL,
	"status" "tournament_preparation_status" DEFAULT 'no' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_tournament_preparation_user_id_tournament_id_category_pk" PRIMARY KEY("user_id","tournament_id","category")
);
--> statement-breakpoint
ALTER TABLE "user_tournament_attachment" ADD CONSTRAINT "user_tournament_attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tournament_attachment" ADD CONSTRAINT "user_tournament_attachment_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tournament_preparation" ADD CONSTRAINT "user_tournament_preparation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tournament_preparation" ADD CONSTRAINT "user_tournament_preparation_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tournament_attachment_owner_idx" ON "user_tournament_attachment" USING btree ("user_id","tournament_id");--> statement-breakpoint
CREATE INDEX "user_tournament_attachment_tournament_idx" ON "user_tournament_attachment" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "user_tournament_preparation_tournament_idx" ON "user_tournament_preparation" USING btree ("tournament_id");
--> statement-breakpoint
ALTER TABLE "user_tournament_attachment" DROP CONSTRAINT "user_tournament_attachment_payload_check";--> statement-breakpoint
ALTER TABLE "user_tournament_attachment" ADD CONSTRAINT "user_tournament_attachment_payload_check" CHECK ((
    ("user_tournament_attachment"."kind" = 'file' AND "user_tournament_attachment"."object_key" IS NOT NULL AND "user_tournament_attachment"."file_name" IS NOT NULL AND "user_tournament_attachment"."mime_type" IS NOT NULL AND "user_tournament_attachment"."byte_size" IS NOT NULL AND "user_tournament_attachment"."byte_size" > 0 AND "user_tournament_attachment"."content" IS NULL)
    OR ("user_tournament_attachment"."kind" IN ('text', 'link') AND "user_tournament_attachment"."content" IS NOT NULL AND "user_tournament_attachment"."object_key" IS NULL AND "user_tournament_attachment"."file_name" IS NULL AND "user_tournament_attachment"."mime_type" IS NULL AND "user_tournament_attachment"."byte_size" IS NULL)
  ));
--> statement-breakpoint
CREATE TABLE "user_calendar_subscription" (
	"user_id" text PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_calendar_subscription_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "user_calendar_subscription" ADD CONSTRAINT "user_calendar_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TYPE "public"."calendar_privacy" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "calendar_privacy" "calendar_privacy" DEFAULT 'unlisted' NOT NULL;
