CREATE TABLE "creator_follow" (
	"follower_user_id" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_follow_follower_user_id_creator_id_pk" PRIMARY KEY("follower_user_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "user_follow" (
	"follower_user_id" text NOT NULL,
	"followed_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follow_follower_user_id_followed_user_id_pk" PRIMARY KEY("follower_user_id","followed_user_id"),
	CONSTRAINT "user_follow_not_self" CHECK ("user_follow"."follower_user_id" <> "user_follow"."followed_user_id")
);
--> statement-breakpoint
ALTER TABLE "creator_follow" ADD CONSTRAINT "creator_follow_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_follow" ADD CONSTRAINT "creator_follow_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_followed_user_id_user_id_fk" FOREIGN KEY ("followed_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_follow_target" ON "creator_follow" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "creator_follow_list" ON "creator_follow" USING btree ("follower_user_id","created_at" DESC NULLS LAST,"creator_id");--> statement-breakpoint
CREATE INDEX "user_follow_target" ON "user_follow" USING btree ("followed_user_id");--> statement-breakpoint
CREATE INDEX "user_follow_list" ON "user_follow" USING btree ("follower_user_id","created_at" DESC NULLS LAST,"followed_user_id");