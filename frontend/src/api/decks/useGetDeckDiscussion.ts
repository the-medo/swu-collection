import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { DiscussionInfo } from '../../../../shared/types/discussions.ts';
import { discussionKeys } from '../discussions/queryKeys.ts';
import { useDiscussion } from '../discussions/useDiscussion.ts';
export function useGetDeckDiscussion(deckId: string, enabled = true) {
  const session = useSession();
  const client = useQueryClient();
  const viewer = session.data?.user.id;
  const [known, setKnown] = useState(() => ({
    deckId,
    viewer,
    id: client.getQueryData<DiscussionInfo>(deckDiscussionKeys.discussion(deckId, viewer))?.id,
  }));
  const knownId = known.deckId === deckId && known.viewer === viewer ? known.id : undefined;
  const binding = useQuery<DiscussionInfo, ErrorWithStatus>({
    queryKey: deckDiscussionKeys.discussion(deckId, viewer),
    // Discover the binding once; subsequent refreshes use the shared metadata query.
    enabled: enabled && !!deckId && !session.isPending && !knownId,
    queryFn: async ({ signal }) => {
      const response = await api.deck[':id'].discussion.$get(
        { param: { id: deckId } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load this discussion.');
      const info = (await response.json()).data;
      if (!signal.aborted) client.setQueryData(discussionKeys.info(info.id, viewer), info);
      return info;
    },
    staleTime: Infinity,
    retry: (count, error) => error.status !== 404 && error.status !== 403 && count < 2,
  });
  const discussionId = binding.data?.id ?? knownId;
  if (known.deckId !== deckId || known.viewer !== viewer || known.id !== discussionId)
    setKnown({ deckId, viewer, id: discussionId });
  const info = useDiscussion(discussionId ?? '', enabled);
  useEffect(() => {
    if (!session.isPending && info.data?.id === discussionId && info.data)
      client.setQueryData(deckDiscussionKeys.discussion(deckId, viewer), info.data, {
        updatedAt: info.dataUpdatedAt,
      });
  }, [
    client,
    deckId,
    viewer,
    discussionId,
    info.data,
    info.dataUpdatedAt,
    session.isPending,
  ]);
  return discussionId ? info : binding;
}
