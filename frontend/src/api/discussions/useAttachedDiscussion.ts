import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { DiscussionInfo } from '../../../../shared/types/discussions.ts';
import { discussionKeys } from './queryKeys.ts';
import { useDiscussion } from './useDiscussion.ts';
type BindingKeys = {
  binding: (resourceId: string, viewer?: string) => readonly unknown[];
  discussion: (resourceId: string, viewer?: string) => readonly unknown[];
};

/** Discover a resource binding once, then use the shared, viewer-scoped metadata cache. */
export function useAttachedDiscussion(
  resourceId: string,
  keys: BindingKeys,
  fetchBinding: (resourceId: string, signal: AbortSignal) => Promise<DiscussionInfo>,
  enabled = true,
) {
  const session = useSession();
  const client = useQueryClient();
  const viewer = session.data?.user.id;
  // The immutable ID carries no private content and survives metadata access resets.
  const { data: knownId } = useQuery<string>({
    queryKey: keys.binding(resourceId, viewer),
    enabled: false,
    initialData: () => client.getQueryData<DiscussionInfo>(keys.discussion(resourceId, viewer))?.id,
    staleTime: Infinity,
  });
  const binding = useQuery<DiscussionInfo, ErrorWithStatus>({
    queryKey: keys.discussion(resourceId, viewer),
    // Discover the binding once; subsequent refreshes use the shared metadata query.
    enabled: enabled && !!resourceId && !session.isPending && !knownId,
    queryFn: async ({ signal }) => {
      const info = await fetchBinding(resourceId, signal);
      if (!signal.aborted) {
        client.setQueryData(discussionKeys.info(info.id, viewer), info);
        client.setQueryData(keys.binding(resourceId, viewer), info.id);
      }
      return info;
    },
    staleTime: Infinity,
    retry: (count, error) => error.status !== 404 && error.status !== 403 && count < 2,
  });
  const discussionId = binding.data?.id ?? knownId;
  const info = useDiscussion(discussionId ?? '', enabled);
  useEffect(() => {
    if (!session.isPending && info.data?.id === discussionId && info.data)
      client.setQueryData(keys.discussion(resourceId, viewer), info.data, {
        updatedAt: info.dataUpdatedAt,
      });
  }, [
    client,
    keys,
    resourceId,
    viewer,
    discussionId,
    info.data,
    info.dataUpdatedAt,
    session.isPending,
  ]);
  return discussionId ? info : binding;
}
