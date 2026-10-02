CREATE TABLE "melee_connection" (
	"user_id" text PRIMARY KEY NOT NULL,
	"melee_user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "melee_connection_melee_user_id_unique" UNIQUE("melee_user_id")
);
--> statement-breakpoint
CREATE TABLE "melee_verification" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "melee_connection" ADD CONSTRAINT "melee_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "melee_verification" ADD CONSTRAINT "melee_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;