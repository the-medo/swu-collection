CREATE TABLE "format" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"description" varchar,
	CONSTRAINT "format_name_unique" UNIQUE("name")
);

INSERT INTO "format" (id, name, description) VALUES
  (1, 'Premier', 'Classic constructed format. One leader, one base, 50 cards in a deck is minimum.'),
  (2, 'Twin Suns', 'Constructed format. Two leaders, one base, 80 cards in a deck is minimum (since JTL) and cannot include more than one copy of any card.'),
  (3, 'Sealed play', 'Limited format. Player opens 6 booster packs and builds 30+ cards deck.'),
  (4, 'Draft', 'Limited format. Player opens 3 booster packs, drafts the opened cards and builds 30+ cards deck.'),
  (5, 'Scavenger', 'Constructed format with only common and uncommon rarity cards. Other rules vary (banned cards, rare leaders,...)')
ON CONFLICT (id) DO NOTHING;