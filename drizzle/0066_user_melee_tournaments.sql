CREATE TABLE "user_melee_tournament_sync" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone,
	"refresh_token" uuid
);
--> statement-breakpoint
CREATE TABLE "user_melee_tournaments" (
	"user_id" text NOT NULL,
	"melee_id" integer NOT NULL,
	"tournament_id" uuid,
	"melee_placement" integer,
	"name" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"format" text,
	"attendance" integer NOT NULL,
	"record" text,
	"decklist_id" integer,
	"decklist_name" text,
	"status" integer NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_melee_tournaments_user_id_melee_id_pk" PRIMARY KEY("user_id","melee_id")
);
--> statement-breakpoint
ALTER TABLE "user_melee_tournament_sync" ADD CONSTRAINT "user_melee_tournament_sync_user_id_melee_connection_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."melee_connection"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_melee_tournaments" ADD CONSTRAINT "user_melee_tournaments_user_id_melee_connection_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."melee_connection"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_melee_tournaments" ADD CONSTRAINT "user_melee_tournaments_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_melee_tournaments_tournament_idx" ON "user_melee_tournaments" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_melee_id_idx" ON "tournament" USING btree ("melee_id");