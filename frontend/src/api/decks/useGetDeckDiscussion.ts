import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useAttachedDiscussion } from '../discussions/useAttachedDiscussion.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';

async function fetchBinding(id: string, signal: AbortSignal) {
  const response = await api.deck[':id'].discussion.$get({ param: { id } }, { init: { signal } });
  if (!response.ok) throw await createApiError(response, 'Could not load this discussion.');
  return (await response.json()).data;
}

export function useGetDeckDiscussion(deckId: string, enabled = true) {
  return useAttachedDiscussion(deckId, deckDiscussionKeys, fetchBinding, enabled);
}
