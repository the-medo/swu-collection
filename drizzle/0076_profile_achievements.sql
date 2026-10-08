CREATE TABLE "user_achievement" (
	"user_id" text NOT NULL,
	"slot" integer NOT NULL,
	"tournament_id" uuid NOT NULL,
	CONSTRAINT "user_achievement_user_id_slot_pk" PRIMARY KEY("user_id","slot"),
	CONSTRAINT "user_achievement_user_tournament_unique" UNIQUE("user_id","tournament_id"),
	CONSTRAINT "user_achievement_slot_check" CHECK ("user_achievement"."slot" > 0)
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "achievement_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_melee_connection_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."melee_connection"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_achievement_tournament_idx" ON "user_achievement" USING btree ("tournament_id");--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_achievement_limit_check" CHECK ("user_profile"."achievement_limit" >= 0);