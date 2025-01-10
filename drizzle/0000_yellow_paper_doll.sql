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
	CONSTRAINT "user_email_unique" UNIQUE("email")
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
CREATE TABLE "card" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"definition" json,
	CONSTRAINT "card_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "collection_card" (
	"collection_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"set_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"foil" boolean DEFAULT false NOT NULL,
	"special" boolean DEFAULT false NOT NULL,
	"amount" integer NOT NULL,
	"condition" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "collection_card_pk" PRIMARY KEY("collection_id","set_id","set_number","foil","special","condition")
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
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
	"basic_set_size" integer NOT NULL,
	"hyperspace_set_size" integer NOT NULL,
	CONSTRAINT "set_name_unique" UNIQUE("name"),
	CONSTRAINT "set_abbr_unique" UNIQUE("abbr")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_card" ADD CONSTRAINT "collection_card_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_card" ADD CONSTRAINT "collection_card_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_card" ADD CONSTRAINT "collection_card_set_id_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "name_idx" ON "card" USING btree ("name");