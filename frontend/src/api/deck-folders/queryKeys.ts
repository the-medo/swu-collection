export const deckFolderKeys = {
  all: ['deck-folders'] as const,
  user: (userId: string | undefined) => ['deck-folders', userId] as const,
};
