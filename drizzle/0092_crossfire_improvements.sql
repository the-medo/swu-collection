ALTER TABLE "play"."chat_messages" DROP CONSTRAINT "chat_messages_sequence";--> statement-breakpoint
ALTER TABLE "play"."chat_messages" ALTER COLUMN "seat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "play"."chat_messages" ADD COLUMN "spectator_user_id" text;--> statement-breakpoint
ALTER TABLE "play"."participants" ADD COLUMN "battlefield" jsonb;--> statement-breakpoint
ALTER TABLE "play"."chat_messages" ADD CONSTRAINT "chat_messages_spectator_user_id_user_id_fk" FOREIGN KEY ("spectator_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play"."chat_messages" ADD CONSTRAINT "chat_messages_sequence" CHECK ("play"."chat_messages"."sequence" > 0);