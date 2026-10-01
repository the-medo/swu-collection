export const calendarSharingKeys = {
  all: ['shared-tournament-calendars'] as const,
  user: (viewerId: string | undefined, ownerId: string) =>
    ['shared-tournament-calendars', viewerId, 'user', ownerId] as const,
  team: (viewerId: string | undefined, teamId: string, from: string) =>
    ['shared-tournament-calendars', viewerId, 'team', teamId, from] as const,
  privacy: (userId?: string) => ['calendar-privacy', userId] as const,
};
