CREATE TABLE "application_configuration" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);

INSERT INTO "application_configuration" (key, value) VALUES ('live_tournament_mode', 'false');