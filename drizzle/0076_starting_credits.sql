-- Add a one-time starting grant without replacing any existing credit balance.
-- Registration uses the same unique source key to prevent duplicate grants.
INSERT INTO "user_credits" ("user_id", "amount", "source", "source_key")
SELECT "id", 10000, 'starting', 'starting:' || "id"
FROM "user"
ON CONFLICT ("source_key") DO NOTHING;
