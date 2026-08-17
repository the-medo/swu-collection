INSERT INTO "tournament_type" ("id", "name", "sort_value", "major")
VALUES ('open', 'Open', 275, 1)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "sort_value" = EXCLUDED."sort_value",
  "major" = EXCLUDED."major";
