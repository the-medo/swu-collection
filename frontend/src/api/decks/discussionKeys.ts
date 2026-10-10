export const deckDiscussionKeys = {
  all: ['deck-discussion'] as const,
  deck: (deckId: string) => ['deck-discussion', deckId] as const,
  article: (deckId: string, viewerId?: string) =>
    ['deck-discussion', deckId, 'article', viewerId ?? 'anonymous'] as const,
  discussion: (deckId: string, viewerId?: string) =>
    ['deck-discussion', deckId, 'discussion', viewerId ?? 'anonymous'] as const,
  comments: (deckId: string, viewerId?: string) =>
    ['deck-discussion', deckId, 'comments', viewerId ?? 'anonymous'] as const,
  ownComments: (deckId: string, viewerId?: string) =>
    ['deck-discussion', deckId, 'own-comments', viewerId ?? 'anonymous'] as const,
};
