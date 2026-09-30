CREATE TABLE "user_calendar_subscription" (
	"user_id" text PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_calendar_subscription_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "user_calendar_subscription" ADD CONSTRAINT "user_calendar_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;