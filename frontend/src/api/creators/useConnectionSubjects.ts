import { CONNECTION_TOURNAMENT_PAGE_SIZE } from '../../../../shared/creators/contracts.ts';
import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import type { EntityReference } from '../../../../shared/creators/contracts.ts';
import { hubApi } from './client.ts';
import { creatorKeys } from './keys.ts';

export function useConnectionChoices(
  type: EntityReference['type'],
  search: string,
  enabled = true,
) {
  const user = useUser();
  const [query, setQuery] = useState(search.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const result = useInfiniteQuery({
    queryKey: creatorKeys.subjectChoices(type, query, user?.id),
    enabled: enabled && !!user && ['deck', 'tournament', 'set'].includes(type),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => hubApi.subjects(type, query, 'authoring', pageParam),
    getNextPageParam: (last, pages) =>
      type !== 'set' &&
      last.length === (type === 'tournament' ? CONNECTION_TOURNAMENT_PAGE_SIZE : 50)
        ? pages.length + 1
        : undefined,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  return { ...result, typing: search.trim() !== query };
}

export function useResolvedSubjects(references: EntityReference[]) {
  // Timestamps affect playback, not subject metadata.
  const subjects = references.map(ref => ({ ...ref, startSeconds: null }));
  const user = useUser();
  const result = useQuery({
    queryKey: [...creatorKeys.resolvedSubjects(subjects), user?.id],
    queryFn: () => hubApi.resolveSubjects(subjects),
    enabled: !!user && !!subjects.length,
    // Keep existing boxes stable while resolving an addition. Never carry data
    // across accounts or include subjects removed from the current document.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[previousQuery.queryKey.length - 1] === user?.id
        ? previous?.filter(item =>
            subjects.some(ref => ref.type === item.type && ref.id === item.id),
          )
        : undefined,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  const resolved = result.data;
  return {
    ...result,
    data:
      resolved &&
      references.flatMap(ref => {
        const metadata = resolved.find(item => item.type === ref.type && item.id === ref.id);
        return metadata ? [{ ...metadata, ...ref }] : [];
      }),
  };
}
