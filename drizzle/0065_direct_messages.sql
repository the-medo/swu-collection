CREATE TABLE "direct_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_one_id" text NOT NULL,
	"user_two_id" text NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"user_one_read_sequence" integer DEFAULT 0 NOT NULL,
	"user_two_read_sequence" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_conversation_order_check" CHECK ("direct_conversation"."user_one_id" COLLATE "C" < "direct_conversation"."user_two_id" COLLATE "C"),
	CONSTRAINT "direct_conversation_read_check" CHECK ("direct_conversation"."user_one_read_sequence" BETWEEN 0 AND "direct_conversation"."last_sequence" AND "direct_conversation"."user_two_read_sequence" BETWEEN 0 AND "direct_conversation"."last_sequence")
);
--> statement-breakpoint
CREATE TABLE "direct_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"sender_id" text NOT NULL,
	"client_message_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_message_body_check" CHECK (char_length("direct_message"."body") BETWEEN 1 AND 5000),
	CONSTRAINT "direct_message_sequence_check" CHECK ("direct_message"."sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "direct_conversation" ADD CONSTRAINT "direct_conversation_user_one_id_user_id_fk" FOREIGN KEY ("user_one_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversation" ADD CONSTRAINT "direct_conversation_user_two_id_user_id_fk" FOREIGN KEY ("user_two_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_conversation_id_direct_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "direct_conversation_pair_idx" ON "direct_conversation" USING btree ("user_one_id","user_two_id");--> statement-breakpoint
CREATE INDEX "direct_conversation_user_one_idx" ON "direct_conversation" USING btree ("user_one_id","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "direct_conversation_user_two_idx" ON "direct_conversation" USING btree ("user_two_id","last_message_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "direct_message_sequence_idx" ON "direct_message" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_message_retry_idx" ON "direct_message" USING btree ("sender_id","client_message_id");--> statement-breakpoint
CREATE INDEX "direct_message_sender_time_idx" ON "direct_message" USING btree ("sender_id","created_at");