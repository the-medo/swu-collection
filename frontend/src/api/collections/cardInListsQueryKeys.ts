export const cardInListsQueryKeys = {
  all: ['card-in-lists'] as const,
  card: (userId: string, cardId: string) => ['card-in-lists', userId, cardId] as const,
};
