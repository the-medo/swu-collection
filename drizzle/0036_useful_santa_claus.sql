CREATE TABLE "integration" (
	"id" smallint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "integration_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_integration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"integration_id" smallint NOT NULL,
	"external_user_id" text NOT NULL,
	"link_token_enc" text,
	"refresh_token_enc" text,
	"access_token_enc" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"linked_at" timestamp,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_integration_user_id_integration_id_unique" UNIQUE("user_id","integration_id"),
	CONSTRAINT "user_integration_integration_id_external_user_id_unique" UNIQUE("integration_id","external_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_integration" ADD CONSTRAINT "user_integration_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_integration" ADD CONSTRAINT "user_integration_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integration"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_integration_user" ON "user_integration" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_access_token" ON "user_integration" USING btree ("access_token_enc");--> statement-breakpoint
CREATE INDEX "idx_refresh_token" ON "user_integration" USING btree ("refresh_token_enc");--> statement-breakpoint
CREATE INDEX "idx_user_integration_integration" ON "user_integration" USING btree ("integration_id");

INSERT INTO "integration" VALUES (1, 'karabast');