export const userFileKeys = {
  all: (userId: string | undefined) => ['user-files', userId] as const,
  list: (userId: string | undefined, page: number) => [...userFileKeys.all(userId), page] as const,
  infinite: (userId: string | undefined) => [...userFileKeys.all(userId), 'infinite'] as const,
};
