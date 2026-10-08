export const userProfileKeys = {
  all: ['user-profile'] as const,
  detail: (userId: string) => [...userProfileKeys.all, userId] as const,
  achievements: (userId: string) => [...userProfileKeys.detail(userId), 'achievements'] as const,
};
