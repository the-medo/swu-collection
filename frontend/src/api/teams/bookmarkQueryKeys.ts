export const teamBookmarkQueryKeys = {
  team: (teamId?: string) => ['team-bookmarks', teamId] as const,
  list: (teamId?: string, userId?: string) => ['team-bookmarks', teamId, userId] as const,
};
