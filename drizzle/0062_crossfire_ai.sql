CREATE TABLE "play"."ai_activations" (
	"id" text PRIMARY KEY NOT NULL,
	"leader_card_id" text NOT NULL,
	"target" jsonb NOT NULL,
	"release_id" text NOT NULL,
	"previous_id" text,
	"actor_id" text,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play"."ai_active" (
	"leader_card_id" text NOT NULL,
	"target_hash" text NOT NULL,
	"target" jsonb NOT NULL,
	"release_id" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_active_leader_card_id_target_hash_pk" PRIMARY KEY("leader_card_id","target_hash")
);
--> statement-breakpoint
CREATE TABLE "play"."ai_training_consents" (
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	"policy" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_training_consents_game_id_user_id_pk" PRIMARY KEY("game_id","user_id"),
	CONSTRAINT "ai_consent_policy" CHECK ("play"."ai_training_consents"."policy" = 1)
);
--> statement-breakpoint
CREATE TABLE "play"."ai_training_exports" (
	"export_id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"game_id" text,
	"group_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purged_at" timestamp with time zone,
	"state" text DEFAULT 'pending' NOT NULL,
	"checksum" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_training_exports_game_id_unique" UNIQUE("game_id"),
	CONSTRAINT "ai_exports_state" CHECK ("play"."ai_training_exports"."state" IN ('pending','exported','revoked','failed'))
);
--> statement-breakpoint
CREATE TABLE "play"."ai_games" (
	"game_id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"request_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"release_id" text NOT NULL,
	"pin" jsonb NOT NULL,
	"deck_label" text NOT NULL,
	"release_label" text NOT NULL,
	"replay_expired_at" timestamp with time zone,
	"retry_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "play"."ai_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"checksum" text NOT NULL,
	"leader_card_id" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"weights" "bytea" NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_weights_size" CHECK (octet_length("play"."ai_releases"."weights") <= 32000000)
);
--> statement-breakpoint
CREATE TABLE "play"."ai_replay_limits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"replay_limit" integer,
	CONSTRAINT "ai_replay_limit_nonnegative" CHECK ("play"."ai_replay_limits"."replay_limit" IS NULL OR "play"."ai_replay_limits"."replay_limit" >= 0)
);
--> statement-breakpoint
ALTER TABLE "play"."games" ADD COLUMN "mode" text DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "play"."ai_activations" ADD CONSTRAINT "ai_activations_release_id_ai_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "play"."ai_releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_activations" ADD CONSTRAINT "ai_activations_previous_id_ai_releases_id_fk" FOREIGN KEY ("previous_id") REFERENCES "play"."ai_releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_activations" ADD CONSTRAINT "ai_activations_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_active" ADD CONSTRAINT "ai_active_release_id_ai_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "play"."ai_releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_training_consents" ADD CONSTRAINT "ai_training_consents_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_training_consents" ADD CONSTRAINT "ai_training_consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_training_exports" ADD CONSTRAINT "ai_training_exports_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_games" ADD CONSTRAINT "ai_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_games" ADD CONSTRAINT "ai_games_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_games" ADD CONSTRAINT "ai_games_release_id_ai_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "play"."ai_releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."ai_replay_limits" ADD CONSTRAINT "ai_replay_limits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_activations_date" ON "play"."ai_activations" USING btree ("activated_at");--> statement-breakpoint
CREATE INDEX "ai_exports_pending" ON "play"."ai_training_exports" USING btree ("state","updated_at");--> statement-breakpoint
CREATE INDEX "ai_games_owner" ON "play"."ai_games" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ai_games_replays" ON "play"."ai_games" USING btree ("owner_id") WHERE "play"."ai_games"."replay_expired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "ai_releases_leader" ON "play"."ai_releases" USING btree ("leader_card_id");--> statement-breakpoint
ALTER TABLE "play"."games" ADD CONSTRAINT "games_mode" CHECK ("play"."games"."mode" IN ('human', 'ai'));