import type { DiscoveryQuery, EntityReference } from '../../../../shared/creators/contracts.ts';
const root = ['creator-hub'] as const;
const publicRoot = [...root, 'public'] as const;
const privateRoot = [...root, 'private'] as const;
const infiniteDiscoveryRoot = [...publicRoot, 'discovery', 'infinite'] as const;
export const creatorKeys = {
  all: root,
  reports: [...privateRoot, 'reports'] as const,
  reportList: (status: 'open' | 'resolved', page: number) =>
    [...privateRoot, 'reports', status, page] as const,
  reportStatus: (id: string) => [...privateRoot, 'report-status', id] as const,
  directories: [...publicRoot, 'directory'] as const,
  directory: (q: string, page: number, language: string, tags: string[]) =>
    [...publicRoot, 'directory', { q, page, language, tags }] as const,
  profiles: [...publicRoot, 'profile'] as const,
  profile: (slug: string) => [...publicRoot, 'profile', slug] as const,
  discoveries: [...publicRoot, 'discovery'] as const,
  followingDiscoveries: [...privateRoot, 'following-discovery'] as const,
  followingDiscovery: (query: Partial<DiscoveryQuery>) =>
    [...privateRoot, 'following-discovery', query] as const,
  discovery: (query: Partial<DiscoveryQuery>) => [...publicRoot, 'discovery', query] as const,
  infiniteDiscoveries: infiniteDiscoveryRoot,
  infiniteDiscovery: (query: Partial<DiscoveryQuery>) => [...infiniteDiscoveryRoot, query] as const,
  decks: (id?: string) => [...publicRoot, 'collections', 'decks', id] as const,
  creations: [...publicRoot, 'creation'] as const,
  creation: (id: string) => [...publicRoot, 'creation', id] as const,
  collectionsRoot: [...publicRoot, 'collections'] as const,
  sectionCounts: (id?: string) => [...publicRoot, 'collections', 'counts', id] as const,
  collections: (id?: string) => [...publicRoot, 'collections', id] as const,
  personalCounts: [...privateRoot, 'personal-counts'] as const,
  youtubeClaim: (claimId: string) => [...privateRoot, 'youtube-claim', claimId] as const,
  mine: [...privateRoot, 'mine'] as const,
  studios: [...privateRoot, 'studio'] as const,
  studio: (id?: string | null, page?: number) =>
    [...privateRoot, 'studio', id, ...(page === undefined ? [] : [page])] as const,
  draft: (id?: string) => [...privateRoot, 'draft', id] as const,
  revisions: (id?: string) => [...privateRoot, 'revisions', id] as const,
  youtube: (id: string) => [...privateRoot, 'youtube', id] as const,
  members: (id: string) => [...privateRoot, 'members', id] as const,
  resolvedSubjects: (refs: EntityReference[]) =>
    [...privateRoot, 'resolved-subjects', refs] as const,
  subjectChoices: (type: EntityReference['type'], q: string, userId?: string, creatorId?: string) =>
    [...privateRoot, 'subject-choices', { type, q, userId, creatorId }] as const,
  subjects: (type: EntityReference['type'], q: string, scope: 'discovery' | 'authoring') =>
    [...root, 'subjects', { type, q, scope }] as const,
};
