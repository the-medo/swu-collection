CREATE TABLE "mcp_mutation" (
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"tool" text NOT NULL,
	"input_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_mutation_user_id_client_id_request_id_pk" PRIMARY KEY("user_id","client_id","request_id")
);
--> statement-breakpoint
ALTER TABLE "mcp_mutation" ADD CONSTRAINT "mcp_mutation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;