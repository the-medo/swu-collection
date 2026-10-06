export const deckKeys = {
  detail: (id: string | undefined, viewerId?: string) =>
    ['deck', id, viewerId ?? 'anonymous'] as const,
  cards: (id: string | undefined, viewerId?: string) =>
    ['deck-content', id, viewerId ?? 'anonymous'] as const,
  bulk: (ids: string[] | undefined, viewerId?: string) =>
    ['decks-bulk', ids?.join(',') ?? null, viewerId ?? 'anonymous'] as const,
};
