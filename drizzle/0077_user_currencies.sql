ALTER TABLE "user_credits" ADD COLUMN "currency" text DEFAULT 'credits' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_credits" ADD COLUMN "item_id" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "credit_balance" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "beskar_balance_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_currency_check" CHECK ("user_credits"."currency" IN ('credits', 'beskar'));--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_item_check" CHECK ("user_credits"."item_id" IS NULL OR "user_credits"."item_id" IN ('achievement-slot', 'battlefield-slot'));--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_credit_balance_check" CHECK ("user_profile"."credit_balance" BETWEEN -9007199254740991 AND 9007199254740991);--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_beskar_balance_check" CHECK ("user_profile"."beskar_balance_cents" BETWEEN 0 AND 9007199254740991);--> statement-breakpoint

-- These keys are also used by registration/session recovery, so each account
-- receives the starting award exactly once while retaining previous credits.
INSERT INTO "user_credits" ("user_id", "currency", "amount", "source", "source_key")
SELECT "id", 'credits', 10000, 'starting', 'starting:' || "id"
FROM "user"
ON CONFLICT ("source_key") DO NOTHING;--> statement-breakpoint

-- Award beskar for support that has already passed Patreon reconciliation.
-- credited_cents is the awarded high-water mark, including past support from
-- cancelled memberships; pending or held increases are not awarded here.
INSERT INTO "user_credits" ("user_id", "currency", "amount", "source", "source_key")
SELECT "user_id", 'beskar', "credited_cents", 'patreon',
  'patreon-beskar:' || "campaign_id" || ':' || "member_id" || ':' || "credited_cents"
FROM "patreon_member"
WHERE "user_id" IS NOT NULL AND "credited_cents" > 0
ON CONFLICT ("source_key") DO NOTHING;--> statement-breakpoint

INSERT INTO "user_profile" ("user_id")
SELECT "id" FROM "user"
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

-- Aggregate history once during migration. All live reads use these columns.
UPDATE "user_profile" AS profile
SET "credit_balance" = totals.credits, "beskar_balance_cents" = totals.beskar
FROM (
  SELECT "user_id",
    coalesce(sum("amount") FILTER (WHERE "currency" = 'credits'), 0) AS credits,
    coalesce(sum("amount") FILTER (WHERE "currency" = 'beskar'), 0) AS beskar
  FROM "user_credits"
  GROUP BY "user_id"
) AS totals
WHERE profile."user_id" = totals."user_id";--> statement-breakpoint

CREATE FUNCTION apply_user_currency_delta(owner_id text, credit_delta bigint, beskar_delta bigint)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Cascading account deletion must not recreate a profile or debit a wallet
  -- whose user has already been removed.
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE "id" = owner_id) THEN
    RETURN;
  END IF;
  IF credit_delta = 0 AND beskar_delta = 0 THEN
    RETURN;
  END IF;
  INSERT INTO "user_profile" ("user_id") VALUES (owner_id)
  ON CONFLICT ("user_id") DO NOTHING;
  UPDATE "user_profile"
  SET "credit_balance" = "credit_balance" + credit_delta,
      "beskar_balance_cents" = "beskar_balance_cents" + beskar_delta
  WHERE "user_id" = owner_id;
END;
$$;--> statement-breakpoint

CREATE FUNCTION sync_user_currency_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."user_id" = NEW."user_id" THEN
    -- Apply the net change together to avoid a transient negative balance
    -- when correcting an award after some of its beskar has been spent.
    PERFORM apply_user_currency_delta(NEW."user_id",
      CASE WHEN NEW."currency" = 'credits' THEN NEW."amount" ELSE 0 END
        - CASE WHEN OLD."currency" = 'credits' THEN OLD."amount" ELSE 0 END,
      CASE WHEN NEW."currency" = 'beskar' THEN NEW."amount" ELSE 0 END
        - CASE WHEN OLD."currency" = 'beskar' THEN OLD."amount" ELSE 0 END);
  ELSE
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
      PERFORM apply_user_currency_delta(OLD."user_id",
        CASE WHEN OLD."currency" = 'credits' THEN -OLD."amount" ELSE 0 END,
        CASE WHEN OLD."currency" = 'beskar' THEN -OLD."amount" ELSE 0 END);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      PERFORM apply_user_currency_delta(NEW."user_id",
        CASE WHEN NEW."currency" = 'credits' THEN NEW."amount" ELSE 0 END,
        CASE WHEN NEW."currency" = 'beskar' THEN NEW."amount" ELSE 0 END);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER user_credits_sync_balance
AFTER INSERT OR UPDATE OR DELETE ON "user_credits"
FOR EACH ROW EXECUTE FUNCTION sync_user_currency_balance();
