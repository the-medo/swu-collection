CREATE TABLE "deck_card_variant" (
	"deck_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_card_variant-pk" PRIMARY KEY("deck_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "deck_card_variant_user_default" (
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"show_everywhere" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_card_variant_user_default-pk" PRIMARY KEY("user_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "deck_card_variant" ADD CONSTRAINT "deck_card_variant_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_card_variant_user_default" ADD CONSTRAINT "deck_card_variant_user_default_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;