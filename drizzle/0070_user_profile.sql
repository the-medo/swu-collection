CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"favorite_leader_card_id" text,
	"favorite_card_id" text,
	"favorite_aspects" text[] DEFAULT '{}' NOT NULL,
	"total_support" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"active_supporter" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_profile_favorite_aspects_check" CHECK (cardinality("user_profile"."favorite_aspects") <= 3
        AND "user_profile"."favorite_aspects" <@ ARRAY['Command', 'Aggression', 'Cunning', 'Vigilance', 'Heroism', 'Villainy']::text[]
        AND array_position("user_profile"."favorite_aspects", NULL) IS NULL),
	CONSTRAINT "user_profile_total_support_check" CHECK ("user_profile"."total_support" >= 0 AND "user_profile"."total_support" < 1000000000000)
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;