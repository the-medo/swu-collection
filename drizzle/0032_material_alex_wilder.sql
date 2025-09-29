ALTER TABLE "deck" ALTER COLUMN "public" DROP DEFAULT;

ALTER TABLE "deck"
    ALTER COLUMN "public" SET DATA TYPE integer
        USING (CASE WHEN "public" IS TRUE THEN 1
                    WHEN "public" IS FALSE THEN 0
                    ELSE NULL END);

ALTER TABLE "deck" ALTER COLUMN "public" SET DEFAULT 0;