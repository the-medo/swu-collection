/** Stable IDs are persisted. Rename labels freely; never recycle an ID. */
export const tagDimensions = [
  'medium',
  'purpose',
  'format',
  'audience',
  'topic',
  'environment',
] as const;
export type TagDimension = (typeof tagDimensions)[number];
export const dimensionLabels: Record<TagDimension, string> = {
  medium: 'Medium',
  purpose: 'Content type',
  format: 'Format',
  audience: 'Experience level',
  topic: 'Topics',
  environment: 'Play environment',
};
export type CreationTag = {
  id: string;
  dimension: TagDimension;
  slug: string;
  label: string;
  description: string;
  position: number;
  parentId: string | null;
};
const groups: Record<TagDimension, [string, string, string, string?][]> = {
  medium: [
    ['article', 'Article', 'Written content published on SWUBASE.'],
    ['video', 'Video', 'A video, recording, or stream.'],
    ['audio', 'Podcast / audio', 'An audio episode or podcast.'],
    ['external', 'External resource', 'Writing or another resource hosted elsewhere.'],
  ],
  purpose: [
    ['deck-guide', 'Deck guide', 'Deck techs, card choices, piloting, and matchup guides.'],
    ['meta-report', 'Meta report', 'The competitive field, rankings, and tier lists.'],
    ['gameplay', 'Gameplay', 'Recorded or live matches.'],
    ['match-analysis', 'Match analysis', 'Commentary and analysis of decisions in a match.'],
    ['tournament-report', 'Tournament coverage', 'Event reports, results, and on-site coverage.'],
    ['card-review', 'Review', 'Evaluation of cards, sets, products, or accessories.'],
    ['spoiler-preview', 'Spoiler / preview', 'Newly revealed cards or products.'],
    ['news', 'News', 'Announcements and developments in the game.'],
    ['tutorial', 'Tutorial / rules', 'Learning how to play, rules, timing, and interactions.'],
    ['strategy', 'Strategy', 'Game plans, experiments, and principles that apply across decks.'],
    [
      'limited-guide',
      'Limited guide',
      'Draft walkthroughs, pick priorities, and sealed pool building.',
    ],
    ['discussion', 'Discussion / interview', 'Opinions, conversations, and community spotlights.'],
    ['unboxing', 'Opening / unboxing', 'Opening packs or products.'],
  ],
  format: [
    ['constructed', 'Constructed', 'Play with a deck built before the event.'],
    ['premier', 'Premier', 'Premier constructed play.', 'constructed'],
    ['eternal', 'Eternal', 'Constructed play using cards from every set.', 'constructed'],
    ['limited', 'Limited', 'Decks built from a restricted pool of opened cards.'],
    ['draft', 'Draft', 'Limited play with drafted cards.', 'limited'],
    ['sealed', 'Sealed', 'Limited play with a sealed pool.', 'limited'],
    ['twin-suns', 'Twin Suns', 'Multiplayer Twin Suns play.'],
    ['custom', 'Custom format', 'A creator-defined format or house rules.'],
  ],
  audience: [
    ['beginner', 'Beginner', 'Learning the game and its fundamentals.'],
    ['advanced', 'Advanced', 'Detailed analysis for experienced players.'],
    ['competitive', 'Competitive', 'Preparation and optimization for organized competition.'],
    ['casual', 'Casual', 'Social and recreational play.'],
    ['organizer', 'Organizer / judge', 'Running events, judging, and supporting a local scene.'],
    ['collector', 'Collector', 'Collecting and managing physical cards.'],
  ],
  topic: [
    ['deckbuilding', 'Deckbuilding', 'Card choices, deck construction, and upgrades.'],
    [
      'play-decisions',
      'Play decisions',
      'Mulligans, resourcing, sequencing, combat, and initiative.',
    ],
    ['sideboarding', 'Sideboarding', 'Adjusting a deck between games.'],
    ['matchups', 'Matchups', 'Strategies against particular decks.'],
    ['archetypes', 'Archetypes', 'Aggro, midrange, control, combo, and tempo strategies.'],
    ['budget', 'Budget', 'Affordable deckbuilding and substitutions.'],
    ['testing', 'Playtesting / preparation', 'Practice, mindset, and improving decision-making.'],
    ['statistics', 'Statistics / data', 'Interpreting results and game data.'],
    ['rules', 'Rules / interactions', 'Rules questions and card interactions.'],
    ['limited', 'Draft / sealed strategy', 'Draft picks and building from a limited pool.'],
    ['multiplayer', 'Multiplayer', 'Politics and strategy with multiple opponents.'],
    ['collecting', 'Collecting', 'Collections, trading, and card art.'],
    ['tools', 'Tools / accessories', 'Software, storage, sleeves, and play equipment.'],
    ['organized-play', 'Organized play', 'Events, tournament systems, and preparation.'],
  ],
  environment: [
    ['tabletop', 'Tabletop', 'In-person play with physical cards.'],
    ['online', 'Online', 'Karabast, Crossfire, Tabletop Simulator, or webcam play.'],
  ],
};
export const creationTags: CreationTag[] = tagDimensions.flatMap(dimension =>
  groups[dimension].map(([slug, label, description, parent], position) => ({
    id: `${dimension}:${slug}`,
    dimension,
    slug,
    label,
    description,
    position,
    parentId: parent ? `${dimension}:${parent}` : null,
  })),
);
export const creationTagMap = new Map(creationTags.map(tag => [tag.id, tag]));
/** Retired IDs remain readable in old links and open editor sessions. */
export const retiredTagIds: Record<string, string[]> = {
  'purpose:deck-tech': ['purpose:deck-guide'],
  'purpose:matchup-guide': ['purpose:deck-guide'],
  'purpose:event-coverage': ['purpose:tournament-report'],
  'purpose:set-review': ['purpose:card-review'],
  'purpose:product-review': ['purpose:card-review'],
  'purpose:rules-explainer': ['purpose:tutorial'],
  'purpose:draft-guide': ['purpose:limited-guide'],
  'purpose:draft-log': ['purpose:limited-guide'],
  'purpose:sealed-guide': ['purpose:limited-guide'],
  'purpose:tier-list': ['purpose:meta-report'],
  'purpose:interview': ['purpose:discussion'],
  'purpose:community': ['purpose:discussion'],
  'purpose:challenge': ['purpose:strategy'],
  'audience:intermediate': ['audience:advanced'],
  'topic:mulligans': ['topic:play-decisions'],
  'topic:resourcing': ['topic:play-decisions'],
  'topic:sequencing': ['topic:play-decisions'],
  'topic:combat': ['topic:play-decisions'],
  'topic:initiative': ['topic:play-decisions'],
  'topic:aggro': ['topic:archetypes'],
  'topic:midrange': ['topic:archetypes'],
  'topic:control': ['topic:archetypes'],
  'topic:combo': ['topic:archetypes'],
  'topic:tempo': ['topic:archetypes'],
  'topic:upgrades': ['topic:deckbuilding'],
  'topic:mental-game': ['topic:testing'],
  'topic:draft-picks': ['topic:limited'],
  'topic:pool-building': ['topic:limited'],
  'topic:trading': ['topic:collecting'],
  'topic:art-lore': ['topic:collecting'],
  'topic:accessories': ['topic:tools'],
  'environment:karabast': ['environment:online'],
  'environment:crossfire': ['environment:online'],
  'environment:tabletop-simulator': ['environment:online'],
  'environment:webcam': ['environment:online'],
};
export const formatGroups: Record<string, string[]> = {
  'format:constructed': ['format:premier', 'format:eternal'],
  'format:limited': ['format:draft', 'format:sealed'],
};
export function isKnownTagId(id: string) {
  return creationTagMap.has(id) || Object.prototype.hasOwnProperty.call(retiredTagIds, id);
}
/** Persist individual formats; the parent choices are shortcuts, not additional tags. */
export function normalizeTagIds(ids: string[]): string[] {
  return [
    ...new Set(
      ids.flatMap(id =>
        Object.prototype.hasOwnProperty.call(retiredTagIds, id)
          ? retiredTagIds[id]
          : Object.prototype.hasOwnProperty.call(formatGroups, id)
            ? formatGroups[id]
            : [id],
      ),
    ),
  ];
}
export const expandTagIds = normalizeTagIds;
export function toggleTagIds(selected: string[], id: string, checked: boolean) {
  const current = normalizeTagIds(selected),
    toggled = normalizeTagIds([id]);
  return checked
    ? [...new Set([...current, ...toggled])]
    : current.filter(value => !toggled.includes(value));
}
