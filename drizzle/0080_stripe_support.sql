CREATE TABLE "stripe_checkout" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" text,
	"kind" text NOT NULL,
	"currency" text NOT NULL,
	"amount" integer,
	"price_id" text NOT NULL,
	"state" text DEFAULT 'creating' NOT NULL,
	"stripe_id" text,
	"subscription_id" text,
	"review_invoice_id" text,
	"url" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_checkout_stripe_id_unique" UNIQUE("stripe_id"),
	CONSTRAINT "stripe_checkout_subscription_id_unique" UNIQUE("subscription_id"),
	CONSTRAINT "stripe_checkout_kind_check" CHECK ("stripe_checkout"."kind" IN ('monthly', 'one_time')),
	CONSTRAINT "stripe_checkout_currency_check" CHECK ("stripe_checkout"."currency" IN ('EUR', 'USD')),
	CONSTRAINT "stripe_checkout_state_check" CHECK ("stripe_checkout"."state" IN ('creating', 'open', 'complete', 'expired')),
	CONSTRAINT "stripe_checkout_amount_check" CHECK (("stripe_checkout"."kind" = 'one_time' AND "stripe_checkout"."amount" IS NULL) OR ("stripe_checkout"."kind" = 'monthly' AND "stripe_checkout"."amount" IS NOT NULL AND "stripe_checkout"."amount" IN (5, 10, 20)))
);
--> statement-breakpoint
CREATE TABLE "stripe_customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"user_id" text,
	"stripe_id" text,
	"review_required" boolean DEFAULT false NOT NULL,
	"review_keys" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customer_stripe_id_unique" UNIQUE("stripe_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"checkout_id" uuid NOT NULL,
	"invoice_id" text,
	"currency" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"usd_cents" integer,
	"usd_per_eur" text,
	"rate_date" text,
	"paid_at" timestamp with time zone NOT NULL,
	"credited_at" timestamp with time zone,
	"review_required" boolean DEFAULT false NOT NULL,
	CONSTRAINT "stripe_payment_currency_check" CHECK ("stripe_payment"."currency" IN ('EUR', 'USD')),
	CONSTRAINT "stripe_payment_amount_check" CHECK ("stripe_payment"."amount_cents" > 0 AND ("stripe_payment"."usd_cents" IS NULL OR "stripe_payment"."usd_cents" > 0))
);
--> statement-breakpoint
ALTER TABLE "stripe_checkout" ADD CONSTRAINT "stripe_checkout_customer_id_stripe_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."stripe_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_checkout" ADD CONSTRAINT "stripe_checkout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_customer" ADD CONSTRAINT "stripe_customer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_payment" ADD CONSTRAINT "stripe_payment_customer_id_stripe_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."stripe_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_payment" ADD CONSTRAINT "stripe_payment_checkout_id_stripe_checkout_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."stripe_checkout"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stripe_checkout_customer_idx" ON "stripe_checkout" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_checkout_pending_monthly_idx" ON "stripe_checkout" USING btree ("customer_id") WHERE "stripe_checkout"."kind" = 'monthly' AND "stripe_checkout"."state" IN ('creating', 'open');--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_customer_account_user_idx" ON "stripe_customer" USING btree ("account_id","user_id");--> statement-breakpoint
CREATE INDEX "stripe_payment_customer_paid_idx" ON "stripe_payment" USING btree ("customer_id","paid_at");