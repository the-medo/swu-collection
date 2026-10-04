CREATE TABLE "user_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"image_key" text NOT NULL,
	"thumbnail_key" text NOT NULL,
	"original_byte_size" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"thumbnail_byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_file_dimensions_check" CHECK ("user_file"."width" > 0 AND "user_file"."height" > 0),
	CONSTRAINT "user_file_sizes_check" CHECK ("user_file"."original_byte_size" > 0 AND "user_file"."byte_size" > 0 AND "user_file"."thumbnail_byte_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_file_storage" (
	"user_id" text PRIMARY KEY NOT NULL,
	"quota_bytes" bigint DEFAULT 100000000 NOT NULL,
	CONSTRAINT "user_file_storage_quota_check" CHECK ("user_file_storage"."quota_bytes" >= 0 AND "user_file_storage"."quota_bytes" <= 9007199254740991)
);
--> statement-breakpoint
ALTER TABLE "user_avatar" ALTER COLUMN "card_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_avatar" ALTER COLUMN "variant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_avatar" ALTER COLUMN "side" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_avatar" ADD COLUMN "file_id" uuid;--> statement-breakpoint
ALTER TABLE "user_file" ADD CONSTRAINT "user_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_file_storage" ADD CONSTRAINT "user_file_storage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_file_owner_created_idx" ON "user_file" USING btree ("user_id","created_at","id");--> statement-breakpoint
ALTER TABLE "user_avatar" ADD CONSTRAINT "user_avatar_source_check" CHECK (("user_avatar"."file_id" IS NULL AND "user_avatar"."card_id" IS NOT NULL AND "user_avatar"."variant_id" IS NOT NULL AND "user_avatar"."side" IS NOT NULL)
        OR ("user_avatar"."file_id" IS NOT NULL AND "user_avatar"."card_id" IS NULL AND "user_avatar"."variant_id" IS NULL AND "user_avatar"."side" IS NULL));