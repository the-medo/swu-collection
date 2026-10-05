export const deckFolderKeys = {
  all: ['deck-folders'] as const,
  user: (userId: string | undefined) => ['deck-folders', userId] as const,
  shared: (id: string, viewerId: string | undefined) =>
    ['deck-folders', 'shared', id, viewerId ?? 'anonymous'] as const,
};
