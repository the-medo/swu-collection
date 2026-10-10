import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import type { DeckArticle } from '../../../../shared/types/deck-discussion.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export async function getDeckArticle(deckId: string): Promise<DeckArticle | null> {
  const response = await api.deck[':id'].article.$get({ param: { id: deckId } });
  if (!response.ok) throw await createApiError(response, 'Could not load this guide.');
  return (await response.json()).data;
}
export function useGetDeckArticle(deckId: string, enabled = true) {
  const session = useSession();
  return useQuery<DeckArticle | null, ErrorWithStatus>({
    queryKey: deckDiscussionKeys.article(deckId, session.data?.user.id),
    queryFn: () => getDeckArticle(deckId),
    enabled: enabled && !!deckId && !session.isPending,
    staleTime: Infinity,
    retry: (count, error) => error.status !== 404 && error.status !== 403 && count < 2,
  });
}
