CREATE TABLE "integration_app" (
	"client_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"secret_hash" text NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"scopes" text[] NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_app_code" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scopes" text[] NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "integration_app_code_client_user_unique" UNIQUE("client_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "integration_app_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scopes" text[] NOT NULL,
	"access_token_hash" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"access_expires_at" timestamp NOT NULL,
	"refresh_expires_at" timestamp NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integration_app_connection_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "integration_app_connection_refresh_token_hash_unique" UNIQUE("refresh_token_hash"),
	CONSTRAINT "integration_app_connection_client_user_unique" UNIQUE("client_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "integration_app_refresh_use" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"connection_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_app" ADD CONSTRAINT "integration_app_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_app_code" ADD CONSTRAINT "integration_app_code_client_id_integration_app_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."integration_app"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_app_code" ADD CONSTRAINT "integration_app_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_app_connection" ADD CONSTRAINT "integration_app_connection_client_id_integration_app_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."integration_app"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_app_connection" ADD CONSTRAINT "integration_app_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_app_refresh_use" ADD CONSTRAINT "integration_refresh_use_connection_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_app_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_app_owner_idx" ON "integration_app" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "integration_app_code_user_idx" ON "integration_app_code" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "integration_app_code_expiry_idx" ON "integration_app_code" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "integration_app_connection_user_idx" ON "integration_app_connection" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "integration_refresh_use_connection_idx" ON "integration_app_refresh_use" USING btree ("connection_id","expires_at");