CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"display_name" text NOT NULL,
	"country" text,
	"state" text,
	"currency" text NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "collection_card" (
	"collection_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"foil" boolean DEFAULT false NOT NULL,
	"condition" integer DEFAULT 1 NOT NULL,
	"language" text,
	"note" text,
	"amount" integer NOT NULL,
	"amount2" integer,
	"price" numeric(12, 2),
	CONSTRAINT "collection_card_pk" PRIMARY KEY("collection_id","card_id","variant_id","foil","condition","language")
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar NOT NULL,
	"wantlist" boolean NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"abbr" varchar,
	"release_date" date NOT NULL,
	"card_count" integer NOT NULL,
	CONSTRAINT "set_name_unique" UNIQUE("name"),
	CONSTRAINT "set_abbr_unique" UNIQUE("abbr")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_card" ADD CONSTRAINT "collection_card_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_id_idx" ON "collection_card" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "variant_id_idx" ON "collection_card" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "foil_idx" ON "collection_card" USING btree ("foil");--> statement-breakpoint
CREATE INDEX "condition_idx" ON "collection_card" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "language_idx" ON "collection_card" USING btree ("language");