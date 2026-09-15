CREATE SCHEMA "play";
--> statement-breakpoint
CREATE TABLE "play"."bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"position" text NOT NULL,
	"branch" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_handles" CHECK ("play"."bookmarks"."position" ~ '^[a-f0-9]{32}$' AND "play"."bookmarks"."branch" ~ '^[a-f0-9]{32}$'),
	CONSTRAINT "bookmarks_label" CHECK (length("play"."bookmarks"."label") <= 120)
);
--> statement-breakpoint
CREATE TABLE "play"."card_bundles" (
	"version" text PRIMARY KEY NOT NULL,
	"checksum" text NOT NULL,
	"required_engine" text NOT NULL,
	"r2_key" text,
	"definitions" jsonb NOT NULL,
	"source_commit" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_bundle_checksum" CHECK ("play"."card_bundles"."checksum" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "play"."chat_messages" (
	"game_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"id" text NOT NULL,
	"seat" text NOT NULL,
	"text" text NOT NULL,
	"after_event" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_game_id_sequence_pk" PRIMARY KEY("game_id","sequence"),
	CONSTRAINT "chat_messages_sequence" CHECK ("play"."chat_messages"."sequence" > 0 AND "play"."chat_messages"."sequence" <= 500),
	CONSTRAINT "chat_messages_seat" CHECK ("play"."chat_messages"."seat" IN ('p1','p2')),
	CONSTRAINT "chat_messages_text" CHECK (length("play"."chat_messages"."text") BETWEEN 1 AND 1000),
	CONSTRAINT "chat_messages_after_event" CHECK ("play"."chat_messages"."after_event" IS NULL OR "play"."chat_messages"."after_event" >= 0)
);
--> statement-breakpoint
CREATE TABLE "play"."checkpoints" (
	"game_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"revision" integer NOT NULL,
	"state_hash" text NOT NULL,
	"checkpoint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkpoints_game_id_sequence_pk" PRIMARY KEY("game_id","sequence"),
	CONSTRAINT "checkpoints_counters" CHECK ("play"."checkpoints"."sequence" >= 0 AND "play"."checkpoints"."revision" >= 0),
	CONSTRAINT "checkpoints_size" CHECK (octet_length("play"."checkpoints"."checkpoint") <= 8388608)
);
--> statement-breakpoint
CREATE TABLE "play"."connection_tickets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"lobby_id" text NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"purpose" text DEFAULT 'live' NOT NULL,
	"seat" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connection_tickets_purpose" CHECK ("play"."connection_tickets"."purpose" IN ('live', 'replay')),
	CONSTRAINT "connection_tickets_hash" CHECK ("play"."connection_tickets"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "connection_tickets_role_seat" CHECK (("play"."connection_tickets"."role" = 'player' AND "play"."connection_tickets"."seat" IS NOT NULL AND "play"."connection_tickets"."seat" IN ('p1', 'p2'))
        OR ("play"."connection_tickets"."role" = 'spectator' AND "play"."connection_tickets"."seat" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "play"."games" (
	"id" text PRIMARY KEY NOT NULL,
	"versions" jsonb NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"revision" integer NOT NULL,
	"state_hash" text NOT NULL,
	"history_key" text DEFAULT gen_random_uuid()::text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"summary" jsonb,
	"provenance" jsonb,
	"ended_at" timestamp with time zone,
	"statistics_at" timestamp with time zone,
	"owner_id" text,
	"fence" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_status" CHECK ("play"."games"."status" IN ('running', 'ended', 'finalized', 'abandoned')),
	CONSTRAINT "games_counters" CHECK ("play"."games"."sequence" >= 0 AND "play"."games"."revision" >= 0 AND "play"."games"."fence" >= 0),
	CONSTRAINT "games_owner_lease" CHECK (("play"."games"."owner_id" IS NULL) = ("play"."games"."lease_until" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "play"."invitations" (
	"lobby_id" text PRIMARY KEY NOT NULL,
	"recipient_user_id" text
);
--> statement-breakpoint
CREATE TABLE "play"."journal_live" (
	"game_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"actor_id" text NOT NULL,
	"command_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"from_revision" integer NOT NULL,
	"revision" integer NOT NULL,
	"state_hash" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"facts" jsonb NOT NULL,
	"timeline" jsonb,
	"control" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_live_game_id_sequence_pk" PRIMARY KEY("game_id","sequence"),
	CONSTRAINT "journal_counters" CHECK ("play"."journal_live"."sequence" > 0 AND "play"."journal_live"."from_revision" >= 0 AND "play"."journal_live"."revision" > "play"."journal_live"."from_revision")
);
--> statement-breakpoint
CREATE TABLE "play"."journal_history" (
	"game_id" text PRIMARY KEY NOT NULL,
	"format" integer NOT NULL,
	"sequence" integer NOT NULL,
	"state_hash" text NOT NULL,
	"payload_hash" text NOT NULL,
	"raw_bytes" integer NOT NULL,
	"payload" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_history_format" CHECK ("play"."journal_history"."format" = 1),
	CONSTRAINT "journal_history_size" CHECK ("play"."journal_history"."raw_bytes" > 0 AND "play"."journal_history"."raw_bytes" <= 67108864 AND octet_length("play"."journal_history"."payload") <= 8388608)
);
--> statement-breakpoint
CREATE TABLE "play"."lobbies" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_user_id" text,
	"game_id" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"best_of" integer DEFAULT 1 NOT NULL,
	"show_leader" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '3 minutes' NOT NULL,
	"versions" jsonb NOT NULL,
	"allow_spectators" boolean DEFAULT false NOT NULL,
	"hands_to_players" boolean DEFAULT false NOT NULL,
	"hands_to_spectators" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lobbies_game_id_unique" UNIQUE("game_id"),
	CONSTRAINT "lobbies_best_of" CHECK ("play"."lobbies"."best_of" IN (1, 3)),
	CONSTRAINT "lobbies_status" CHECK ("play"."lobbies"."status" IN ('waiting', 'started', 'cancelled', 'expired')),
	CONSTRAINT "lobbies_game_status" CHECK (("play"."lobbies"."status" = 'started') = ("play"."lobbies"."game_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "play"."matches" (
	"id" text PRIMARY KEY NOT NULL,
	"rematch_lobby_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play"."match_exits" (
	"match_id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"request_id" text NOT NULL,
	"seat" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "match_exits_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "match_exits_seat" CHECK ("play"."match_exits"."seat" IN ('p1', 'p2')),
	CONSTRAINT "match_exits_status" CHECK ("play"."match_exits"."status" IN ('pending', 'forfeit', 'abandoned')),
	CONSTRAINT "match_exits_closed" CHECK (("play"."match_exits"."status" = 'pending') = ("play"."match_exits"."closed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "play"."match_games" (
	"match_id" text NOT NULL,
	"number" integer NOT NULL,
	"initiative_chooser" text NOT NULL,
	"lobby_id" text NOT NULL,
	CONSTRAINT "match_games_match_id_number_pk" PRIMARY KEY("match_id","number"),
	CONSTRAINT "match_games_chooser" CHECK ("play"."match_games"."initiative_chooser" IN ('p1', 'p2')),
	CONSTRAINT "match_games_number" CHECK ("play"."match_games"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE "play"."match_readiness" (
	"match_id" text NOT NULL,
	"after_lobby_id" text NOT NULL,
	"seat" text NOT NULL,
	"kind" text NOT NULL,
	"session_id" text NOT NULL,
	"deck_snapshot" jsonb NOT NULL,
	CONSTRAINT "match_readiness_match_id_after_lobby_id_seat_kind_pk" PRIMARY KEY("match_id","after_lobby_id","seat","kind"),
	CONSTRAINT "match_readiness_seat" CHECK ("play"."match_readiness"."seat" IN ('p1', 'p2')),
	CONSTRAINT "match_readiness_kind" CHECK ("play"."match_readiness"."kind" IN ('next', 'rematch'))
);
--> statement-breakpoint
CREATE TABLE "play"."participants" (
	"lobby_id" text NOT NULL,
	"seat" text NOT NULL,
	"user_id" text,
	"session_id" text NOT NULL,
	"connection_epoch" integer DEFAULT 0 NOT NULL,
	"deck_snapshot" jsonb NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_lobby_id_seat_pk" PRIMARY KEY("lobby_id","seat"),
	CONSTRAINT "participants_seat" CHECK ("play"."participants"."seat" IN ('p1', 'p2')),
	CONSTRAINT "participants_connection_epoch" CHECK ("play"."participants"."connection_epoch" >= 0)
);
--> statement-breakpoint
CREATE TABLE "play"."practice_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"source_game_id" text NOT NULL,
	"requester_id" text,
	"opponent_id" text,
	"position" text NOT NULL,
	"branch" text NOT NULL,
	"label" text NOT NULL,
	"game_id" text NOT NULL,
	"lobby_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_requests_game_id_unique" UNIQUE("game_id"),
	CONSTRAINT "practice_requests_lobby_id_unique" UNIQUE("lobby_id"),
	CONSTRAINT "practice_requests_status" CHECK ("play"."practice_requests"."status" IN ('pending','accepted','declined')),
	CONSTRAINT "practice_requests_handles" CHECK ("play"."practice_requests"."position" ~ '^[a-f0-9]{32}$' AND "play"."practice_requests"."branch" ~ '^[a-f0-9]{32}$')
);
--> statement-breakpoint
CREATE TABLE "play"."problem_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"position" text NOT NULL,
	"branch" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"checkpoint" "bytea",
	"checkpoint_hash" text,
	"snapshot" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_reports_status" CHECK ("play"."problem_reports"."status" IN ('open','resolved')),
	CONSTRAINT "problem_reports_snapshot" CHECK (("play"."problem_reports"."checkpoint" IS NULL AND "play"."problem_reports"."checkpoint_hash" IS NULL AND "play"."problem_reports"."snapshot" IS NULL) OR ("play"."problem_reports"."checkpoint" IS NOT NULL AND octet_length("play"."problem_reports"."checkpoint") <= 8388608 AND "play"."problem_reports"."checkpoint_hash" IS NOT NULL AND "play"."problem_reports"."checkpoint_hash" ~ '^[a-f0-9]{64}$' AND "play"."problem_reports"."snapshot" IS NOT NULL AND octet_length("play"."problem_reports"."snapshot"::text) <= 8388608)),
	CONSTRAINT "problem_reports_text" CHECK (length("play"."problem_reports"."label") <= 120 AND length("play"."problem_reports"."description") BETWEEN 10 AND 3000),
	CONSTRAINT "problem_reports_handles" CHECK ("play"."problem_reports"."position" ~ '^[a-f0-9]{32}$' AND "play"."problem_reports"."branch" ~ '^[a-f0-9]{32}$')
);
--> statement-breakpoint
CREATE TABLE "play"."report_notifications" (
	"report_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_id" text,
	"lease_until" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel_id" text,
	"app_base_url" text,
	"message_id" text,
	"last_error" text,
	"sent_at" timestamp with time zone,
	CONSTRAINT "report_notifications_status" CHECK ("play"."report_notifications"."status" IN ('pending','sending','sent')),
	CONSTRAINT "report_notifications_attempts" CHECK ("play"."report_notifications"."attempts" >= 0),
	CONSTRAINT "report_notifications_lease" CHECK (("play"."report_notifications"."status" = 'sending') = ("play"."report_notifications"."lease_id" IS NOT NULL AND "play"."report_notifications"."lease_until" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "play"."undo_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"requester" text NOT NULL,
	"sequence" integer NOT NULL,
	"state_hash" text NOT NULL,
	"target" integer NOT NULL,
	"target_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "undo_requests_status" CHECK ("play"."undo_requests"."status" IN ('pending','accepted','declined','cancelled','expired')),
	CONSTRAINT "undo_requests_seat" CHECK ("play"."undo_requests"."requester" IN ('p1','p2')),
	CONSTRAINT "undo_requests_position" CHECK ("play"."undo_requests"."target" >= 0 AND "play"."undo_requests"."target" < "play"."undo_requests"."sequence")
);
--> statement-breakpoint
ALTER TABLE "play"."bookmarks" ADD CONSTRAINT "bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."bookmarks" ADD CONSTRAINT "bookmarks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."chat_messages" ADD CONSTRAINT "chat_messages_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."checkpoints" ADD CONSTRAINT "checkpoints_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."connection_tickets" ADD CONSTRAINT "connection_tickets_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "play"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."connection_tickets" ADD CONSTRAINT "connection_tickets_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."connection_tickets" ADD CONSTRAINT "connection_tickets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."invitations" ADD CONSTRAINT "invitations_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "play"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."invitations" ADD CONSTRAINT "invitations_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."journal_live" ADD CONSTRAINT "journal_live_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."journal_history" ADD CONSTRAINT "journal_history_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."lobbies" ADD CONSTRAINT "lobbies_creator_user_id_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."lobbies" ADD CONSTRAINT "lobbies_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."matches" ADD CONSTRAINT "matches_id_lobbies_id_fk" FOREIGN KEY ("id") REFERENCES "play"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."matches" ADD CONSTRAINT "matches_rematch_lobby_id_lobbies_id_fk" FOREIGN KEY ("rematch_lobby_id") REFERENCES "play"."lobbies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."match_exits" ADD CONSTRAINT "match_exits_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "play"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."match_exits" ADD CONSTRAINT "match_exits_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."match_games" ADD CONSTRAINT "match_games_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "play"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."match_games" ADD CONSTRAINT "match_games_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "play"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."match_readiness" ADD CONSTRAINT "match_readiness_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "play"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."match_readiness" ADD CONSTRAINT "match_readiness_after_lobby_id_lobbies_id_fk" FOREIGN KEY ("after_lobby_id") REFERENCES "play"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."participants" ADD CONSTRAINT "participants_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "play"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."participants" ADD CONSTRAINT "participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."practice_requests" ADD CONSTRAINT "practice_requests_source_game_id_games_id_fk" FOREIGN KEY ("source_game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."practice_requests" ADD CONSTRAINT "practice_requests_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."practice_requests" ADD CONSTRAINT "practice_requests_opponent_id_user_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."problem_reports" ADD CONSTRAINT "problem_reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."problem_reports" ADD CONSTRAINT "problem_reports_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."report_notifications" ADD CONSTRAINT "report_notifications_report_id_problem_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "play"."problem_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."undo_requests" ADD CONSTRAINT "undo_requests_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "play"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_owner" ON "play"."bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bookmarks_game" ON "play"."bookmarks" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "card_bundles_checksum" ON "play"."card_bundles" USING btree ("checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_receipt" ON "play"."chat_messages" USING btree ("game_id","id");--> statement-breakpoint
CREATE INDEX "connection_tickets_expiration" ON "play"."connection_tickets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "games_finalization" ON "play"."games" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "games_statistics_pending" ON "play"."games" USING btree ("updated_at") WHERE "play"."games"."status" = 'finalized' AND "play"."games"."statistics_at" IS NULL;--> statement-breakpoint
CREATE INDEX "invitations_recipient" ON "play"."invitations" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_command_receipt" ON "play"."journal_live" USING btree ("game_id","actor_id","command_id");--> statement-breakpoint
CREATE INDEX "lobbies_waiting_expiry" ON "play"."lobbies" USING btree ("expires_at") WHERE "play"."lobbies"."status" = 'waiting';--> statement-breakpoint
CREATE INDEX "match_exits_pending" ON "play"."match_exits" USING btree ("created_at") WHERE "play"."match_exits"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "match_games_lobby" ON "play"."match_games" USING btree ("lobby_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_one_seat_per_user" ON "play"."participants" USING btree ("lobby_id","user_id");--> statement-breakpoint
CREATE INDEX "practice_requests_requester" ON "play"."practice_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "practice_requests_opponent" ON "play"."practice_requests" USING btree ("opponent_id");--> statement-breakpoint
CREATE INDEX "problem_reports_owner" ON "play"."problem_reports" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "problem_reports_status" ON "play"."problem_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "report_notifications_due" ON "play"."report_notifications" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "undo_requests_game" ON "play"."undo_requests" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "undo_requests_pending" ON "play"."undo_requests" USING btree ("game_id") WHERE "play"."undo_requests"."status" = 'pending';