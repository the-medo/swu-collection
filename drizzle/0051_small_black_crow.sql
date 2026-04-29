CREATE TABLE "screenshotter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" varchar(80) NOT NULL,
	"scope_id" text,
	"scope_key" text NOT NULL,
	"target" varchar(120) NOT NULL,
	"r2_key" text NOT NULL,
	"url" text NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" integer,
	"width" integer,
	"height" integer,
	"source_url" text,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "screenshotter_scope_target_uidx" ON "screenshotter" USING btree ("scope_key","target");--> statement-breakpoint
CREATE INDEX "screenshotter_scope_idx" ON "screenshotter" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "screenshotter_scope_key_idx" ON "screenshotter" USING btree ("scope_key");--> statement-breakpoint
CREATE INDEX "screenshotter_status_idx" ON "screenshotter" USING btree ("status");--> statement-breakpoint
CREATE INDEX "screenshotter_generated_at_idx" ON "screenshotter" USING btree ("generated_at");