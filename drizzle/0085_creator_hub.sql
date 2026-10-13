-- Consolidated creator-hub migration. Sections retain their original execution order
-- so schema, taxonomy seeds, normalization and generic backfills stay equivalent.
-- Regression tests use the named section markers. Creator profiles are imported through administration.

-- creator-hub-section: creator_hub
CREATE TABLE "creation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"author_id" text,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"revision" integer DEFAULT 1 NOT NULL,
	"published_revision" integer,
	"source_video_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creation_source_video_id_unique" UNIQUE("source_video_id")
);
--> statement-breakpoint
CREATE TABLE "creation_reference" (
	"creation_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	CONSTRAINT "creation_reference_creation_id_entity_type_entity_id_pk" PRIMARY KEY("creation_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "creation_revision" (
	"creation_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creation_revision_creation_id_revision_pk" PRIMARY KEY("creation_id","revision")
);
--> statement-breakpoint
CREATE TABLE "creation_tag" (
	"creation_id" uuid NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "creation_tag_creation_id_tag_id_pk" PRIMARY KEY("creation_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "creator_member" (
	"creator_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "creator_member_creator_id_user_id_pk" PRIMARY KEY("creator_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "creator_oauth_state" (
	"hash" text PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"verifier" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"profile" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_profile_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "creator_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"dimension" text NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"position" integer NOT NULL,
	"parent_id" text
);
--> statement-breakpoint
CREATE TABLE "creator_youtube" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_reference" ADD CONSTRAINT "creation_reference_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_revision" ADD CONSTRAINT "creation_revision_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_tag" ADD CONSTRAINT "creation_tag_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_tag" ADD CONSTRAINT "creation_tag_tag_id_creator_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."creator_tag"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_member" ADD CONSTRAINT "creator_member_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_member" ADD CONSTRAINT "creator_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_oauth_state" ADD CONSTRAINT "creator_oauth_state_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_oauth_state" ADD CONSTRAINT "creator_oauth_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profile" ADD CONSTRAINT "creator_profile_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_youtube" ADD CONSTRAINT "creator_youtube_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creation_creator" ON "creation" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "creation_publication" ON "creation" USING btree ("published_at","id");--> statement-breakpoint
CREATE INDEX "creation_reference_filter" ON "creation_reference" USING btree ("entity_type","entity_id","creation_id");--> statement-breakpoint
CREATE INDEX "creation_tag_filter" ON "creation_tag" USING btree ("tag_id","creation_id");--> statement-breakpoint
CREATE INDEX "creator_member_user" ON "creator_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creator_profile_owner" ON "creator_profile" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_tag_dimension_slug" ON "creator_tag" USING btree ("dimension","slug");--> statement-breakpoint
CREATE INDEX "creator_youtube_owner" ON "creator_youtube" USING btree ("creator_id");
-- end-creator-hub-section: creator_hub
--> statement-breakpoint

-- creator-hub-section: creator_taxonomy
-- Stable, curated discovery terms. Context and entity IDs are separate metadata.
INSERT INTO creator_tag (id, dimension, slug, label, description, position, parent_id) VALUES
('medium:article', 'medium', 'article', 'Article', 'Written content published on SWUBASE.', 0, NULL),
('medium:video', 'medium', 'video', 'Video', 'A video, recording, or stream.', 1, NULL),
('medium:audio', 'medium', 'audio', 'Podcast / audio', 'An audio episode or podcast.', 2, NULL),
('medium:external', 'medium', 'external', 'External resource', 'Writing or another resource hosted elsewhere.', 3, NULL),
('purpose:deck-guide', 'purpose', 'deck-guide', 'Deck guide', 'How to build and pilot a particular deck.', 0, NULL),
('purpose:deck-tech', 'purpose', 'deck-tech', 'Deck tech', 'Card choices and construction of a deck.', 1, NULL),
('purpose:meta-report', 'purpose', 'meta-report', 'Meta report', 'An overview of the competitive field.', 2, NULL),
('purpose:gameplay', 'purpose', 'gameplay', 'Gameplay', 'Recorded or live matches.', 3, NULL),
('purpose:match-analysis', 'purpose', 'match-analysis', 'Match analysis', 'Commentary and analysis of decisions in a match.', 4, NULL),
('purpose:matchup-guide', 'purpose', 'matchup-guide', 'Matchup guide', 'How to approach a specific opposing deck.', 5, NULL),
('purpose:tournament-report', 'purpose', 'tournament-report', 'Tournament report', 'A participant’s experience and results.', 6, NULL),
('purpose:event-coverage', 'purpose', 'event-coverage', 'Event coverage', 'Reporting, commentary, or interviews from an event.', 7, NULL),
('purpose:card-review', 'purpose', 'card-review', 'Card review', 'Evaluation of individual cards.', 8, NULL),
('purpose:set-review', 'purpose', 'set-review', 'Set review', 'Evaluation of a set or a large part of one.', 9, NULL),
('purpose:spoiler-preview', 'purpose', 'spoiler-preview', 'Spoiler / preview', 'Newly revealed cards or products.', 10, NULL),
('purpose:news', 'purpose', 'news', 'News', 'Announcements and developments in the game.', 11, NULL),
('purpose:tutorial', 'purpose', 'tutorial', 'Tutorial', 'A practical explanation of how something works.', 12, NULL),
('purpose:rules-explainer', 'purpose', 'rules-explainer', 'Rules explainer', 'Rules, timing, and interactions.', 13, NULL),
('purpose:strategy', 'purpose', 'strategy', 'Strategy', 'Principles and decisions that apply across decks.', 14, NULL),
('purpose:draft-guide', 'purpose', 'draft-guide', 'Draft guide', 'Pick priorities, archetypes, and draft strategy.', 15, NULL),
('purpose:draft-log', 'purpose', 'draft-log', 'Draft walkthrough', 'A recorded or written pick-by-pick draft.', 16, NULL),
('purpose:sealed-guide', 'purpose', 'sealed-guide', 'Sealed guide', 'Pool evaluation and sealed deck construction.', 17, NULL),
('purpose:tier-list', 'purpose', 'tier-list', 'Tier list', 'Ranked evaluations with supporting reasoning.', 18, NULL),
('purpose:interview', 'purpose', 'interview', 'Interview', 'A conversation with a player, creator, or organizer.', 19, NULL),
('purpose:discussion', 'purpose', 'discussion', 'Discussion / opinion', 'A discussion or editorial perspective.', 20, NULL),
('purpose:challenge', 'purpose', 'challenge', 'Challenge / experiment', 'An unusual constraint or tested hypothesis.', 21, NULL),
('purpose:product-review', 'purpose', 'product-review', 'Product review', 'Accessories, products, or play tools.', 22, NULL),
('purpose:unboxing', 'purpose', 'unboxing', 'Opening / unboxing', 'Opening packs or products.', 23, NULL),
('purpose:community', 'purpose', 'community', 'Community spotlight', 'People, local scenes, and community projects.', 24, NULL),
('format:constructed', 'format', 'constructed', 'Constructed', 'Play with a deck built before the event.', 0, NULL),
('format:premier', 'format', 'premier', 'Premier', 'Premier constructed play.', 1, 'format:constructed'),
('format:twin-suns', 'format', 'twin-suns', 'Twin Suns', 'Multiplayer Twin Suns play.', 2, 'format:constructed'),
('format:limited', 'format', 'limited', 'Limited', 'Decks built from a restricted pool of opened cards.', 3, NULL),
('format:draft', 'format', 'draft', 'Draft', 'Limited play with drafted cards.', 4, 'format:limited'),
('format:sealed', 'format', 'sealed', 'Sealed', 'Limited play with a sealed pool.', 5, 'format:limited'),
('format:custom', 'format', 'custom', 'Custom format', 'A creator-defined format or house rules.', 6, NULL),
('audience:beginner', 'audience', 'beginner', 'Beginner', 'Learning the game and its fundamentals.', 0, NULL),
('audience:intermediate', 'audience', 'intermediate', 'Intermediate', 'Developing deckbuilding and play skills.', 1, NULL),
('audience:advanced', 'audience', 'advanced', 'Advanced', 'Detailed analysis for experienced players.', 2, NULL),
('audience:competitive', 'audience', 'competitive', 'Competitive', 'Preparation and optimization for organized competition.', 3, NULL),
('audience:casual', 'audience', 'casual', 'Casual', 'Social and recreational play.', 4, NULL),
('audience:organizer', 'audience', 'organizer', 'Organizer / judge', 'Running events, judging, and supporting a local scene.', 5, NULL),
('audience:collector', 'audience', 'collector', 'Collector', 'Collecting and managing physical cards.', 6, NULL),
('topic:deckbuilding', 'topic', 'deckbuilding', 'Deckbuilding', 'Selecting cards and balancing a deck.', 0, NULL),
('topic:mulligans', 'topic', 'mulligans', 'Mulligans', 'Opening hands and mulligan choices.', 1, NULL),
('topic:resourcing', 'topic', 'resourcing', 'Resourcing', 'Resource decisions throughout a game.', 2, NULL),
('topic:sequencing', 'topic', 'sequencing', 'Sequencing', 'Action order and timing.', 3, NULL),
('topic:combat', 'topic', 'combat', 'Combat', 'Attacking, defending, and trading units.', 4, NULL),
('topic:initiative', 'topic', 'initiative', 'Initiative', 'Claiming and using initiative.', 5, NULL),
('topic:sideboarding', 'topic', 'sideboarding', 'Sideboarding', 'Adjusting a deck between games.', 6, NULL),
('topic:matchups', 'topic', 'matchups', 'Matchups', 'Strategies against particular decks.', 7, NULL),
('topic:archetypes', 'topic', 'archetypes', 'Archetypes', 'Deck families and strategic identities.', 8, NULL),
('topic:aggro', 'topic', 'aggro', 'Aggro', 'Aggressive strategies.', 9, NULL),
('topic:midrange', 'topic', 'midrange', 'Midrange', 'Flexible value and board-based strategies.', 10, NULL),
('topic:control', 'topic', 'control', 'Control', 'Long-game and reactive strategies.', 11, NULL),
('topic:combo', 'topic', 'combo', 'Combo', 'Synergies and combinations that drive a game plan.', 12, NULL),
('topic:tempo', 'topic', 'tempo', 'Tempo', 'Converting efficient actions into advantage.', 13, NULL),
('topic:budget', 'topic', 'budget', 'Budget', 'Affordable deckbuilding and substitutions.', 14, NULL),
('topic:upgrades', 'topic', 'upgrades', 'Deck upgrades', 'Improving a starter or existing deck.', 15, NULL),
('topic:testing', 'topic', 'testing', 'Playtesting', 'Practice methods and interpreting test results.', 16, NULL),
('topic:mental-game', 'topic', 'mental-game', 'Mental game', 'Mindset, preparation, and decision-making.', 17, NULL),
('topic:statistics', 'topic', 'statistics', 'Statistics / data', 'Interpreting results and game data.', 18, NULL),
('topic:rules', 'topic', 'rules', 'Rules / interactions', 'Rules questions and card interactions.', 19, NULL),
('topic:draft-picks', 'topic', 'draft-picks', 'Draft picks', 'Evaluating cards during a draft.', 20, NULL),
('topic:pool-building', 'topic', 'pool-building', 'Pool building', 'Building from a limited pool.', 21, NULL),
('topic:multiplayer', 'topic', 'multiplayer', 'Multiplayer', 'Politics and strategy with multiple opponents.', 22, NULL),
('topic:collecting', 'topic', 'collecting', 'Collecting', 'Building and organizing a collection.', 23, NULL),
('topic:trading', 'topic', 'trading', 'Trading', 'Exchanging and acquiring cards.', 24, NULL),
('topic:art-lore', 'topic', 'art-lore', 'Art / lore', 'Artists, visual design, and Star Wars stories.', 25, NULL),
('topic:accessories', 'topic', 'accessories', 'Accessories', 'Storage, sleeves, playmats, and other equipment.', 26, NULL),
('topic:tools', 'topic', 'tools', 'Tools / software', 'Tools that support playing or collecting.', 27, NULL),
('topic:organized-play', 'topic', 'organized-play', 'Organized play', 'Events, tournament systems, and preparation.', 28, NULL),
('environment:tabletop', 'environment', 'tabletop', 'Tabletop', 'Physical cards at a table.', 0, NULL),
('environment:karabast', 'environment', 'karabast', 'Karabast', 'Play recorded or discussed on Karabast.', 1, NULL),
('environment:crossfire', 'environment', 'crossfire', 'Crossfire', 'Play recorded or discussed on SWUBASE Crossfire.', 2, NULL),
('environment:tabletop-simulator', 'environment', 'tabletop-simulator', 'Tabletop Simulator', 'Play in Tabletop Simulator.', 3, NULL),
('environment:webcam', 'environment', 'webcam', 'Webcam', 'Remote play with physical cards and a camera.', 4, NULL);

-- end-creator-hub-section: creator_taxonomy
--> statement-breakpoint

-- creator-hub-section: creator_publication_dates
ALTER TABLE "creation" ADD COLUMN "public_updated_at" timestamp with time zone;
-- end-creator-hub-section: creator_publication_dates
--> statement-breakpoint

-- creator-hub-section: unowned_creator_profiles
ALTER TABLE "creator_profile" ALTER COLUMN "owner_id" DROP NOT NULL;
-- end-creator-hub-section: unowned_creator_profiles
--> statement-breakpoint

-- creator-hub-section: creator_taxonomy_simplified
-- Consolidate classifications without discarding draft/publication differences or history.
-- The migration runner wraps this file in a transaction. Block concurrent writes while
-- JSON documents, publication indexes, and vocabulary rows are transformed together.
LOCK TABLE creator_profile, creation, creation_revision, creation_tag, creator_tag IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
INSERT INTO creator_tag (id, dimension, slug, label, description, position, parent_id) VALUES
('medium:article', 'medium', 'article', 'Article', 'Written content published on SWUBASE.', 0, NULL),
('medium:video', 'medium', 'video', 'Video', 'A video, recording, or stream.', 1, NULL),
('medium:audio', 'medium', 'audio', 'Podcast / audio', 'An audio episode or podcast.', 2, NULL),
('medium:external', 'medium', 'external', 'External resource', 'Writing or another resource hosted elsewhere.', 3, NULL),
('purpose:deck-guide', 'purpose', 'deck-guide', 'Deck guide', 'Deck techs, card choices, piloting, and matchup guides.', 0, NULL),
('purpose:meta-report', 'purpose', 'meta-report', 'Meta report', 'The competitive field, rankings, and tier lists.', 1, NULL),
('purpose:gameplay', 'purpose', 'gameplay', 'Gameplay', 'Recorded or live matches.', 2, NULL),
('purpose:match-analysis', 'purpose', 'match-analysis', 'Match analysis', 'Commentary and analysis of decisions in a match.', 3, NULL),
('purpose:tournament-report', 'purpose', 'tournament-report', 'Tournament coverage', 'Event reports, results, and on-site coverage.', 4, NULL),
('purpose:card-review', 'purpose', 'card-review', 'Review', 'Evaluation of cards, sets, products, or accessories.', 5, NULL),
('purpose:spoiler-preview', 'purpose', 'spoiler-preview', 'Spoiler / preview', 'Newly revealed cards or products.', 6, NULL),
('purpose:news', 'purpose', 'news', 'News', 'Announcements and developments in the game.', 7, NULL),
('purpose:tutorial', 'purpose', 'tutorial', 'Tutorial / rules', 'Learning how to play, rules, timing, and interactions.', 8, NULL),
('purpose:strategy', 'purpose', 'strategy', 'Strategy', 'Game plans, experiments, and principles that apply across decks.', 9, NULL),
('purpose:limited-guide', 'purpose', 'limited-guide', 'Limited guide', 'Draft walkthroughs, pick priorities, and sealed pool building.', 10, NULL),
('purpose:discussion', 'purpose', 'discussion', 'Discussion / interview', 'Opinions, conversations, and community spotlights.', 11, NULL),
('purpose:unboxing', 'purpose', 'unboxing', 'Opening / unboxing', 'Opening packs or products.', 12, NULL),
('format:constructed', 'format', 'constructed', 'Constructed', 'Play with a deck built before the event.', 0, NULL),
('format:premier', 'format', 'premier', 'Premier', 'Premier constructed play.', 1, 'format:constructed'),
('format:eternal', 'format', 'eternal', 'Eternal', 'Constructed play using cards from every set.', 2, 'format:constructed'),
('format:limited', 'format', 'limited', 'Limited', 'Decks built from a restricted pool of opened cards.', 3, NULL),
('format:draft', 'format', 'draft', 'Draft', 'Limited play with drafted cards.', 4, 'format:limited'),
('format:sealed', 'format', 'sealed', 'Sealed', 'Limited play with a sealed pool.', 5, 'format:limited'),
('format:twin-suns', 'format', 'twin-suns', 'Twin Suns', 'Multiplayer Twin Suns play.', 6, NULL),
('format:custom', 'format', 'custom', 'Custom format', 'A creator-defined format or house rules.', 7, NULL),
('audience:beginner', 'audience', 'beginner', 'Beginner', 'Learning the game and its fundamentals.', 0, NULL),
('audience:advanced', 'audience', 'advanced', 'Advanced', 'Detailed analysis for experienced players.', 1, NULL),
('audience:competitive', 'audience', 'competitive', 'Competitive', 'Preparation and optimization for organized competition.', 2, NULL),
('audience:casual', 'audience', 'casual', 'Casual', 'Social and recreational play.', 3, NULL),
('audience:organizer', 'audience', 'organizer', 'Organizer / judge', 'Running events, judging, and supporting a local scene.', 4, NULL),
('audience:collector', 'audience', 'collector', 'Collector', 'Collecting and managing physical cards.', 5, NULL),
('topic:deckbuilding', 'topic', 'deckbuilding', 'Deckbuilding', 'Card choices, deck construction, and upgrades.', 0, NULL),
('topic:play-decisions', 'topic', 'play-decisions', 'Play decisions', 'Mulligans, resourcing, sequencing, combat, and initiative.', 1, NULL),
('topic:sideboarding', 'topic', 'sideboarding', 'Sideboarding', 'Adjusting a deck between games.', 2, NULL),
('topic:matchups', 'topic', 'matchups', 'Matchups', 'Strategies against particular decks.', 3, NULL),
('topic:archetypes', 'topic', 'archetypes', 'Archetypes', 'Aggro, midrange, control, combo, and tempo strategies.', 4, NULL),
('topic:budget', 'topic', 'budget', 'Budget', 'Affordable deckbuilding and substitutions.', 5, NULL),
('topic:testing', 'topic', 'testing', 'Playtesting / preparation', 'Practice, mindset, and improving decision-making.', 6, NULL),
('topic:statistics', 'topic', 'statistics', 'Statistics / data', 'Interpreting results and game data.', 7, NULL),
('topic:rules', 'topic', 'rules', 'Rules / interactions', 'Rules questions and card interactions.', 8, NULL),
('topic:limited', 'topic', 'limited', 'Draft / sealed strategy', 'Draft picks and building from a limited pool.', 9, NULL),
('topic:multiplayer', 'topic', 'multiplayer', 'Multiplayer', 'Politics and strategy with multiple opponents.', 10, NULL),
('topic:collecting', 'topic', 'collecting', 'Collecting', 'Collections, trading, and card art.', 11, NULL),
('topic:tools', 'topic', 'tools', 'Tools / accessories', 'Software, storage, sleeves, and play equipment.', 12, NULL),
('topic:organized-play', 'topic', 'organized-play', 'Organized play', 'Events, tournament systems, and preparation.', 13, NULL),
('environment:tabletop', 'environment', 'tabletop', 'Tabletop', 'In-person play with physical cards.', 0, NULL),
('environment:online', 'environment', 'online', 'Online', 'Karabast, Crossfire, Tabletop Simulator, or webcam play.', 1, NULL)
ON CONFLICT (id) DO UPDATE SET dimension = EXCLUDED.dimension, slug = EXCLUDED.slug,
 label = EXCLUDED.label, description = EXCLUDED.description, position = EXCLUDED.position, parent_id = EXCLUDED.parent_id;
--> statement-breakpoint
CREATE TEMP TABLE creator_tag_replacements (old_id text PRIMARY KEY, replacements jsonb NOT NULL) ON COMMIT DROP;
--> statement-breakpoint
INSERT INTO creator_tag_replacements VALUES
('purpose:deck-tech', '["purpose:deck-guide"]'::jsonb),
('purpose:matchup-guide', '["purpose:deck-guide"]'::jsonb),
('purpose:event-coverage', '["purpose:tournament-report"]'::jsonb),
('purpose:set-review', '["purpose:card-review"]'::jsonb),
('purpose:product-review', '["purpose:card-review"]'::jsonb),
('purpose:rules-explainer', '["purpose:tutorial"]'::jsonb),
('purpose:draft-guide', '["purpose:limited-guide"]'::jsonb),
('purpose:draft-log', '["purpose:limited-guide"]'::jsonb),
('purpose:sealed-guide', '["purpose:limited-guide"]'::jsonb),
('purpose:tier-list', '["purpose:meta-report"]'::jsonb),
('purpose:interview', '["purpose:discussion"]'::jsonb),
('purpose:community', '["purpose:discussion"]'::jsonb),
('purpose:challenge', '["purpose:strategy"]'::jsonb),
('audience:intermediate', '["audience:advanced"]'::jsonb),
('topic:mulligans', '["topic:play-decisions"]'::jsonb),
('topic:resourcing', '["topic:play-decisions"]'::jsonb),
('topic:sequencing', '["topic:play-decisions"]'::jsonb),
('topic:combat', '["topic:play-decisions"]'::jsonb),
('topic:initiative', '["topic:play-decisions"]'::jsonb),
('topic:aggro', '["topic:archetypes"]'::jsonb),
('topic:midrange', '["topic:archetypes"]'::jsonb),
('topic:control', '["topic:archetypes"]'::jsonb),
('topic:combo', '["topic:archetypes"]'::jsonb),
('topic:tempo', '["topic:archetypes"]'::jsonb),
('topic:upgrades', '["topic:deckbuilding"]'::jsonb),
('topic:mental-game', '["topic:testing"]'::jsonb),
('topic:draft-picks', '["topic:limited"]'::jsonb),
('topic:pool-building', '["topic:limited"]'::jsonb),
('topic:trading', '["topic:collecting"]'::jsonb),
('topic:art-lore', '["topic:collecting"]'::jsonb),
('topic:accessories', '["topic:tools"]'::jsonb),
('environment:karabast', '["environment:online"]'::jsonb),
('environment:crossfire', '["environment:online"]'::jsonb),
('environment:tabletop-simulator', '["environment:online"]'::jsonb),
('environment:webcam', '["environment:online"]'::jsonb),
('format:constructed', '["format:premier","format:eternal"]'::jsonb),
('format:limited', '["format:draft","format:sealed"]'::jsonb);
--> statement-breakpoint
CREATE FUNCTION pg_temp.normalize_creator_tags(tags jsonb) RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(jsonb_agg(value ORDER BY source_position, replacement_position), '[]'::jsonb)
  FROM (
    SELECT DISTINCT ON (replacement.value) replacement.value, source.ordinality AS source_position,
      replacement.ordinality AS replacement_position
    FROM jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb)) WITH ORDINALITY AS source(value, ordinality)
    LEFT JOIN creator_tag_replacements mapping ON mapping.old_id = source.value
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(mapping.replacements, jsonb_build_array(source.value)))
      WITH ORDINALITY AS replacement(value, ordinality)
    ORDER BY replacement.value, source.ordinality, replacement.ordinality
  ) mapped;
$$;
--> statement-breakpoint
UPDATE creator_profile SET profile = jsonb_set(profile, '{specialties}', pg_temp.normalize_creator_tags(profile->'specialties'))
WHERE profile->'specialties' IS DISTINCT FROM pg_temp.normalize_creator_tags(profile->'specialties');
--> statement-breakpoint
UPDATE creation SET draft = jsonb_set(draft, '{tags}', pg_temp.normalize_creator_tags(draft->'tags')),
 published = CASE WHEN published IS NULL THEN NULL ELSE jsonb_set(published, '{tags}', pg_temp.normalize_creator_tags(published->'tags')) END
WHERE draft->'tags' IS DISTINCT FROM pg_temp.normalize_creator_tags(draft->'tags')
 OR (published IS NOT NULL AND published->'tags' IS DISTINCT FROM pg_temp.normalize_creator_tags(published->'tags'));
--> statement-breakpoint
UPDATE creation_revision SET document = jsonb_set(document, '{tags}', pg_temp.normalize_creator_tags(document->'tags'))
WHERE document->'tags' IS DISTINCT FROM pg_temp.normalize_creator_tags(document->'tags');
--> statement-breakpoint
INSERT INTO creation_tag (creation_id, tag_id)
SELECT DISTINCT existing.creation_id, replacement.value
FROM creation_tag existing JOIN creator_tag_replacements mapping ON mapping.old_id = existing.tag_id
CROSS JOIN LATERAL jsonb_array_elements_text(mapping.replacements) AS replacement(value)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM creation_tag WHERE tag_id IN (SELECT old_id FROM creator_tag_replacements);
--> statement-breakpoint
DELETE FROM creator_tag WHERE id IN (
'purpose:deck-tech',
'purpose:matchup-guide',
'purpose:event-coverage',
'purpose:set-review',
'purpose:product-review',
'purpose:rules-explainer',
'purpose:draft-guide',
'purpose:draft-log',
'purpose:sealed-guide',
'purpose:tier-list',
'purpose:interview',
'purpose:community',
'purpose:challenge',
'audience:intermediate',
'topic:mulligans',
'topic:resourcing',
'topic:sequencing',
'topic:combat',
'topic:initiative',
'topic:aggro',
'topic:midrange',
'topic:control',
'topic:combo',
'topic:tempo',
'topic:upgrades',
'topic:mental-game',
'topic:draft-picks',
'topic:pool-building',
'topic:trading',
'topic:art-lore',
'topic:accessories',
'environment:karabast',
'environment:crossfire',
'environment:tabletop-simulator',
'environment:webcam'
);
--> statement-breakpoint
DROP FUNCTION pg_temp.normalize_creator_tags(jsonb);
--> statement-breakpoint
DROP TABLE creator_tag_replacements;

-- end-creator-hub-section: creator_taxonomy_simplified
--> statement-breakpoint

-- creator-hub-section: creator_video_worker
CREATE TABLE "creator_imported_deck" (
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"source_deck_id" text NOT NULL,
	"deck_id" uuid,
	CONSTRAINT "creator_imported_deck_user_id_source_source_deck_id_pk" PRIMARY KEY("user_id","source","source_deck_id")
);
--> statement-breakpoint
CREATE TABLE "creator_video_job" (
	"video_id" text PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claim_id" uuid,
	"lease_until" timestamp with time zone,
	"metadata" jsonb,
	"analysis" jsonb,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_error" text,
	"creation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_video_spend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" text NOT NULL,
	"model" text NOT NULL,
	"reserved_micros" integer NOT NULL,
	"charged_micros" integer,
	"usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_imported_deck" ADD CONSTRAINT "creator_imported_deck_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_imported_deck" ADD CONSTRAINT "creator_imported_deck_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_video_job" ADD CONSTRAINT "creator_video_job_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_video_job" ADD CONSTRAINT "creator_video_job_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_imported_deck_deck" ON "creator_imported_deck" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "creator_video_job_queue" ON "creator_video_job" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "creator_video_job_creator" ON "creator_video_job" USING btree ("creator_id");
-- end-creator-hub-section: creator_video_worker
--> statement-breakpoint

-- creator-hub-section: creator_channel_resolution
CREATE TABLE "creator_channel_resolution" (
	"url" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- end-creator-hub-section: creator_channel_resolution
--> statement-breakpoint

-- creator-hub-section: creator_deck_publication
ALTER TABLE "creator_imported_deck" ADD COLUMN "pending_publication" boolean DEFAULT false NOT NULL;
-- end-creator-hub-section: creator_deck_publication
--> statement-breakpoint

-- creator-hub-section: creator_channel_identity
CREATE TABLE "creator_channel" (
	"creator_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"origin" text NOT NULL,
	"source_url" text,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "creator_channel_creator_id_channel_id_pk" PRIMARY KEY("creator_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "creator_youtube_channel" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"metadata_updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "creator_channel" ADD CONSTRAINT "creator_channel_creator_id_creator_profile_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_channel" ADD CONSTRAINT "creator_channel_channel_id_creator_youtube_channel_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."creator_youtube_channel"("channel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_channel_channel" ON "creator_channel" USING btree ("channel_id");--> statement-breakpoint
-- Preserve channel identity before removing it from the credential table.
INSERT INTO creator_youtube_channel (channel_id, title, metadata_updated_at)
SELECT channel_id, title, connected_at FROM creator_youtube;
--> statement-breakpoint
INSERT INTO creator_channel (creator_id, channel_id, origin)
SELECT creator_id, channel_id, 'oauth' FROM creator_youtube;
--> statement-breakpoint
-- Only staff-curated ownerless profiles can gain associations from public links.
-- URL matching deliberately excludes userinfo, ports and other hosts.
CREATE TEMP TABLE creator_channel_backfill ON COMMIT DROP AS
WITH links AS (
  SELECT p.id AS creator_id, l->>'url' AS url
  FROM creator_profile p, jsonb_array_elements(p.profile->'links') l
  WHERE p.owner_id IS NULL
), direct AS (
  SELECT creator_id,
    substring(url from '^https://(?:www\.)?youtube\.com/channel/(UC[A-Za-z0-9_-]{22})(?:/(?:videos|streams|shorts|featured|about))?/?(?:[?#].*)?$') AS channel_id
  FROM links
), handles AS (
  SELECT l.creator_id, r.channel_id, r.url, r.resolved_at
  FROM links l JOIN creator_channel_resolution r ON
    regexp_replace(regexp_replace(l.url, '^https://(?:www\.)?youtube\.com/', 'https://www.youtube.com/'), '(?:/(?:videos|streams|shorts|featured|about))?/?(?:[?#].*)?$', '') = r.url
  WHERE l.url ~ '^https://(?:www\.)?youtube\.com/@[^/]{1,100}(?:/(?:videos|streams|shorts|featured|about))?/?(?:[?#].*)?$'
)
SELECT DISTINCT ON (creator_id, channel_id) * FROM (
  SELECT creator_id, channel_id, 'https://www.youtube.com/channel/' || channel_id AS source_url, NULL::timestamptz AS resolved_at
  FROM direct WHERE channel_id IS NOT NULL
  UNION ALL
  SELECT creator_id, channel_id, url, resolved_at FROM handles
) candidates ORDER BY creator_id, channel_id, resolved_at NULLS FIRST;
--> statement-breakpoint
INSERT INTO creator_youtube_channel (channel_id)
SELECT DISTINCT channel_id FROM creator_channel_backfill ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO creator_channel (creator_id, channel_id, origin, source_url, resolved_at)
SELECT creator_id, channel_id, 'curated', source_url, resolved_at FROM creator_channel_backfill
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "creator_youtube" ADD CONSTRAINT "creator_youtube_channel_id_creator_youtube_channel_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."creator_youtube_channel"("channel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_youtube" DROP COLUMN "title";
-- end-creator-hub-section: creator_channel_identity
--> statement-breakpoint

-- creator-hub-section: creator_video_descriptions
-- Preserve every saved version. Recover full worker metadata only when its
-- prefix exactly matches that version's summary; never overwrite edited prose.
CREATE FUNCTION pg_temp.creator_video_description(document jsonb, metadata jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN document->>'medium' = 'video' AND NOT document ? 'videoDescription'
    THEN document || jsonb_build_object('videoDescription',
      CASE WHEN metadata->>'description' IS NOT NULL
        AND document->>'summary' = left(metadata->>'description', 1000)
        THEN metadata->>'description' ELSE coalesce(document->>'summary', '') END)
    ELSE document END;
$$;
--> statement-breakpoint
UPDATE creation c SET
  draft = pg_temp.creator_video_description(c.draft, (SELECT metadata FROM creator_video_job WHERE video_id = c.source_video_id)),
  published = pg_temp.creator_video_description(c.published, (SELECT metadata FROM creator_video_job WHERE video_id = c.source_video_id))
WHERE (c.draft->>'medium' = 'video' AND NOT c.draft ? 'videoDescription')
   OR (c.published->>'medium' = 'video' AND NOT c.published ? 'videoDescription');
--> statement-breakpoint
UPDATE creation_revision r SET document = pg_temp.creator_video_description(r.document, j.metadata)
FROM creation c LEFT JOIN creator_video_job j ON j.video_id = c.source_video_id
WHERE r.creation_id = c.id AND r.document->>'medium' = 'video' AND NOT r.document ? 'videoDescription';
--> statement-breakpoint
DROP FUNCTION pg_temp.creator_video_description(jsonb, jsonb);

-- end-creator-hub-section: creator_video_descriptions
--> statement-breakpoint

-- creator-hub-section: creator_description_legacy_normalization
-- Repair fallbacks from 0095 using the exact legacy JS slice(0, 1000).trim()
-- semantics. Matching any shorter prefix could overwrite a creator's edits.
CREATE FUNCTION pg_temp.creator_legacy_video_summary(value text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  WITH characters AS (
    SELECT character, position,
      sum(CASE WHEN ascii(character) > 65535 THEN 2 ELSE 1 END)
        OVER (ORDER BY position) AS utf16_units
    FROM regexp_split_to_table(left(value, 1000), '') WITH ORDINALITY AS part(character, position)
  )
  SELECT btrim(coalesce(string_agg(character, '' ORDER BY position)
    FILTER (WHERE utf16_units <= 1000), ''),
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
  FROM characters;
$$;
--> statement-breakpoint
CREATE FUNCTION pg_temp.creator_repair_video_description(document jsonb, metadata jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN document->>'medium' = 'video'
    AND metadata->>'description' IS NOT NULL
    AND document->>'summary' = pg_temp.creator_legacy_video_summary(metadata->>'description')
    AND (NOT document ? 'videoDescription' OR document->>'videoDescription' = document->>'summary')
    THEN document || jsonb_build_object('videoDescription', metadata->>'description')
    ELSE document END;
$$;
--> statement-breakpoint
UPDATE creation c SET
  draft = pg_temp.creator_repair_video_description(c.draft, j.metadata),
  published = pg_temp.creator_repair_video_description(c.published, j.metadata)
FROM creator_video_job j WHERE j.video_id = c.source_video_id;
--> statement-breakpoint
UPDATE creation_revision r SET document = pg_temp.creator_repair_video_description(r.document, j.metadata)
FROM creation c JOIN creator_video_job j ON j.video_id = c.source_video_id
WHERE r.creation_id = c.id;
--> statement-breakpoint
DROP FUNCTION pg_temp.creator_repair_video_description(jsonb, jsonb);
--> statement-breakpoint
DROP FUNCTION pg_temp.creator_legacy_video_summary(text);

-- end-creator-hub-section: creator_description_legacy_normalization
--> statement-breakpoint

-- creator-hub-section: creation_reports
CREATE TABLE "creation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creation_id" uuid NOT NULL,
	"reporter_id" text,
	"title" text NOT NULL,
	"source_url" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "creation_report_status_check" CHECK ("creation_report"."status" IN ('open', 'dismissed', 'unpublished')),
	CONSTRAINT "creation_report_details_check" CHECK (char_length("creation_report"."details") <= 1000),
	CONSTRAINT "creation_report_resolution_check" CHECK (("creation_report"."status" = 'open' AND "creation_report"."resolved_at" IS NULL) OR ("creation_report"."status" <> 'open' AND "creation_report"."resolved_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "creation_report" ADD CONSTRAINT "creation_report_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_report" ADD CONSTRAINT "creation_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_report" ADD CONSTRAINT "creation_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creation_report_reporter_video" ON "creation_report" USING btree ("reporter_id","creation_id");--> statement-breakpoint
CREATE INDEX "creation_report_queue" ON "creation_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "creation_report_creation" ON "creation_report" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX "creation_report_reporter_time" ON "creation_report" USING btree ("reporter_id","created_at");
-- end-creator-hub-section: creation_reports
--> statement-breakpoint

-- creator-hub-section: creation_report_retries
DROP INDEX "creation_report_reporter_video";--> statement-breakpoint
ALTER TABLE "creation_report" ADD COLUMN "client_report_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "creation_report_request" ON "creation_report" USING btree ("reporter_id","client_report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creation_report_reporter_video" ON "creation_report" USING btree ("reporter_id","creation_id") WHERE "creation_report"."status" = 'open';
-- end-creator-hub-section: creation_report_retries
--> statement-breakpoint

-- creator-hub-section: creator_import_controls
ALTER TABLE "creation" ADD COLUMN "manually_edited_fields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_youtube_channel" ADD COLUMN "auto_import_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_youtube_channel" ADD COLUMN "last_manual_fetch_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creator_video_job" ADD COLUMN "manually_requested" boolean DEFAULT false NOT NULL;
-- end-creator-hub-section: creator_import_controls
--> statement-breakpoint

-- creator-hub-section: protect_existing_video_edits
-- Historical revision retention is bounded. Conservatively protect every saved field
-- on an imported video that was edited before per-field tracking existed.
UPDATE creation
SET manually_edited_fields = (SELECT jsonb_agg(key ORDER BY key) FROM jsonb_object_keys(draft) AS key)
WHERE source_video_id IS NOT NULL AND revision > 1 AND manually_edited_fields = '[]'::jsonb;

-- end-creator-hub-section: protect_existing_video_edits

--> statement-breakpoint

ALTER TABLE "creation" ADD COLUMN "source_channel_id" text;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "source_data_origin" text;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "source_metadata_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "source_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "source_status" text;--> statement-breakpoint
ALTER TABLE "creator_channel" ADD COLUMN "disconnected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creator_channel" ADD COLUMN "disconnect_reason" text;--> statement-breakpoint
ALTER TABLE "creator_youtube" ADD COLUMN "checked_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_youtube_channel" ADD COLUMN "metadata_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creator_youtube_channel" ADD COLUMN "metadata_origin" text;--> statement-breakpoint
ALTER TABLE "creator_video_job" ADD COLUMN "metadata_fetched_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "creation_youtube_refresh" ON "creation" USING btree ("source_checked_at","id");
--> statement-breakpoint
-- creator-hub-section: youtube_lifecycle
-- Imported creations before provenance tracking: only successful worker insertion proves public access.
UPDATE creation AS c SET source_channel_id = j.channel_id, source_data_origin = 'public'
FROM creator_video_job AS j WHERE j.creation_id = c.id AND j.status IN ('published', 'review');
UPDATE creation SET source_data_origin = coalesce(source_data_origin, 'oauth'),
  source_metadata_at = created_at, source_status = 'active'
WHERE source_video_id IS NOT NULL;
UPDATE creation AS c SET source_channel_id = channels.channel_id
FROM (SELECT creator_id, min(channel_id) AS channel_id FROM creator_channel GROUP BY creator_id HAVING count(*) = 1) AS channels
WHERE c.creator_id = channels.creator_id AND c.source_video_id IS NOT NULL AND c.source_channel_id IS NULL;
UPDATE creator_video_job SET metadata_fetched_at = created_at WHERE metadata IS NOT NULL OR analysis IS NOT NULL;
-- Existing connections become due immediately; do not infer the last successful
-- refresh from the original connect date and disconnect a still-valid legacy token.
UPDATE creator_youtube SET checked_at = now() - interval '1 day';
UPDATE creator_youtube_channel AS c SET metadata_origin = CASE WHEN EXISTS
  (SELECT 1 FROM creator_youtube AS y WHERE y.channel_id = c.channel_id) THEN 'oauth' ELSE 'public' END
WHERE metadata_updated_at IS NOT NULL;
-- end-creator-hub-section: youtube_lifecycle

--> statement-breakpoint

ALTER TABLE "creation" ADD COLUMN "published_manually_edited_fields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "creation_revision" ADD COLUMN "manually_edited_fields" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- creator-hub-section: youtube_revision_provenance
-- Reconstruct sticky protections per version. Incomplete history is ambiguous, so
-- preserve existing edits conservatively instead of overwriting an older custom value.
UPDATE creation AS c SET published_manually_edited_fields = coalesce((
  SELECT jsonb_agg(field) FROM jsonb_array_elements_text(c.manually_edited_fields) AS field
  WHERE (SELECT count(*) FROM creation_revision r WHERE r.creation_id = c.id
    AND r.revision <= coalesce(c.published_revision, c.revision)) < coalesce(c.published_revision, c.revision)
  OR NOT EXISTS (SELECT 1 FROM creation_revision r WHERE r.creation_id = c.id AND r.revision = 1)
  OR EXISTS (SELECT 1 FROM creation_revision r JOIN creation_revision original
    ON original.creation_id = r.creation_id AND original.revision = 1
    WHERE r.creation_id = c.id AND r.revision <= coalesce(c.published_revision, c.revision)
      AND r.document->field IS DISTINCT FROM original.document->field)
), '[]'::jsonb) WHERE c.published IS NOT NULL;
UPDATE creation_revision AS r SET manually_edited_fields = coalesce((
  SELECT jsonb_agg(field) FROM jsonb_array_elements_text(c.manually_edited_fields) AS field
  WHERE (SELECT count(*) FROM creation_revision h WHERE h.creation_id = c.id AND h.revision <= r.revision) < r.revision
  OR NOT EXISTS (SELECT 1 FROM creation_revision h WHERE h.creation_id = c.id AND h.revision = 1)
  OR EXISTS (SELECT 1 FROM creation_revision h JOIN creation_revision original
    ON original.creation_id = h.creation_id AND original.revision = 1
    WHERE h.creation_id = c.id AND h.revision <= r.revision
      AND h.document->field IS DISTINCT FROM original.document->field)
), '[]'::jsonb) FROM creation AS c WHERE r.creation_id = c.id;
-- end-creator-hub-section: youtube_revision_provenance

--> statement-breakpoint

ALTER TABLE "creator_youtube" ADD COLUMN "last_check_attempt_at" timestamp with time zone;