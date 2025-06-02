ALTER TABLE "tournament" ADD COLUMN "bracket_info" varchar(50) DEFAULT 'top8';

UPDATE "tournament" SET "bracket_info" = 'top8';