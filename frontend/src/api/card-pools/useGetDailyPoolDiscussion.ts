import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useAttachedDiscussion } from '../discussions/useAttachedDiscussion.ts';
import { dailyPoolDiscussionKeys } from './dailyPoolDiscussionKeys.ts';

async function fetchBinding(id: string, signal: AbortSignal) {
  const response = await api['card-pools'][':id'].discussion.$get(
    { param: { id } },
    { init: { signal } },
  );
  if (!response.ok) throw await createApiError(response, 'Could not load this discussion.');
  return (await response.json()).data;
}

export function useGetDailyPoolDiscussion(poolId: string, enabled = true) {
  return useAttachedDiscussion(poolId, dailyPoolDiscussionKeys, fetchBinding, enabled);
}
