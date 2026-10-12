CREATE TABLE "forum_thread" (
	"discussion_id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author_id" text,
	"opening_comment_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_discussion_id_discussion_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_opening_comment_fk" FOREIGN KEY ("discussion_id","opening_comment_id") REFERENCES "public"."discussion_comment"("discussion_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_thread_author_idx" ON "forum_thread" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "discussion_comment_recent_idx" ON "discussion_comment" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "discussion_comment"."parent_id" IS NULL AND "discussion_comment"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "discussion_comment_latest_idx" ON "discussion_comment" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "discussion_comment"."deleted_at" IS NULL;