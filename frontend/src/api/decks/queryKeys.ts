export const deckKeys = {
  allDetails: ['deck'] as const,
  allCards: ['deck-content'] as const,
  allBulk: ['decks-bulk'] as const,
  allVersions: ['deck-versions'] as const,
  allDiffs: ['deck-version-diff'] as const,
  forCardAll: ['public-decks-for-card'] as const,
  forCard: (cardId: string) => ['public-decks-for-card', cardId] as const,
  detail: (id: string | undefined, viewerId?: string) =>
    ['deck', id, viewerId ?? 'anonymous'] as const,
  cards: (id: string | undefined, viewerId?: string) =>
    ['deck-content', id, viewerId ?? 'anonymous'] as const,
  bulk: (ids: string[] | undefined, viewerId?: string) =>
    ['decks-bulk', ids?.join(',') ?? null, viewerId ?? 'anonymous'] as const,
  versions: (id: string | undefined, viewerId?: string) =>
    ['deck-versions', id, viewerId ?? 'anonymous'] as const,
  diff: (id: string | undefined, versionId: string | undefined, viewerId?: string) =>
    ['deck-version-diff', id, versionId, viewerId ?? 'anonymous'] as const,
};
