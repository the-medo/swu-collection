export const userAlbumKeys = {
  all: ['user-albums'] as const,
  tournament: (viewer: string | undefined, id: string) =>
    ['user-albums', viewer, 'tournament', id] as const,
  tournamentOptions: (viewer: string | undefined, q: string) =>
    ['user-albums', viewer, 'tournament-options', q] as const,
  list: (viewer: string | undefined, owner: string, publicOnly: boolean) =>
    ['user-albums', viewer, 'list', owner, publicOnly] as const,
  detail: (viewer: string | undefined, id: string) =>
    ['user-albums', viewer, 'detail', id] as const,
  membership: (viewer: string | undefined, fileIds: string[], albumId?: string) =>
    ['user-albums', viewer, 'membership', fileIds, albumId] as const,
};
