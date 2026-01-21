CREATE TABLE "integration_game_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" smallint NOT NULL,
	"game_id" text NOT NULL,
	"lobby_id" text NOT NULL,
	"user_id_1" text,
	"user_id_2" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_game_data" ADD CONSTRAINT "integration_game_data_integration_id_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integration"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_game_data" ADD CONSTRAINT "integration_game_data_user_id_1_user_id_fk" FOREIGN KEY ("user_id_1") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_game_data" ADD CONSTRAINT "integration_game_data_user_id_2_user_id_fk" FOREIGN KEY ("user_id_2") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_integration_game_data_game_id" ON "integration_game_data" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_integration_game_data_lobby_id" ON "integration_game_data" USING btree ("lobby_id");