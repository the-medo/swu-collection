CREATE TABLE "creator_publishing_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"input_hash" text NOT NULL,
	"moved" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creation" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "ownership_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_publishing_request" ADD CONSTRAINT "creator_publishing_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_publishing_request" ADD CONSTRAINT "creator_publishing_request_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_publishing_request_user" ON "creator_publishing_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creator_publishing_request_creator" ON "creator_publishing_request" USING btree ("creator_id");--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creation_personal_owner" ON "creation" USING btree ("owner_user_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_one_owner" CHECK (num_nonnulls("creation"."creator_id", "creation"."owner_user_id") = 1);--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_personal_article" CHECK ("creation"."owner_user_id" IS NULL OR ("creation"."draft"->>'medium' = 'article' AND ("creation"."published" IS NULL OR "creation"."published"->>'medium' = 'article') AND "creation"."source_video_id" IS NULL));