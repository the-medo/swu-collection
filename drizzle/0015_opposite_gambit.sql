CREATE TABLE "user_deck_favorite" (
	"user_id" text NOT NULL,
	"deck_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_deck_favorite_user_id_deck_id_pk" PRIMARY KEY("user_id","deck_id")
);
--> statement-breakpoint
ALTER TABLE "user_deck_favorite" ADD CONSTRAINT "user_deck_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_deck_favorite" ADD CONSTRAINT "user_deck_favorite_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;