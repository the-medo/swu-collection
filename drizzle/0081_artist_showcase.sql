CREATE TABLE "artist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"biography" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "artist_alias" (
	"key" text PRIMARY KEY NOT NULL,
	"canonical_key" text NOT NULL,
	CONSTRAINT "artist_alias_distinct_keys" CHECK ("artist_alias"."key" <> "artist_alias"."canonical_key")
);
--> statement-breakpoint
CREATE TABLE "artist_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_alias" ADD CONSTRAINT "artist_alias_key_artist_key_fk" FOREIGN KEY ("key") REFERENCES "public"."artist"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_alias" ADD CONSTRAINT "artist_alias_canonical_key_artist_key_fk" FOREIGN KEY ("canonical_key") REFERENCES "public"."artist"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_link" ADD CONSTRAINT "artist_link_artist_id_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_alias_canonical_idx" ON "artist_alias" USING btree ("canonical_key");--> statement-breakpoint
CREATE INDEX "artist_link_artist_position_idx" ON "artist_link" USING btree ("artist_id","position");