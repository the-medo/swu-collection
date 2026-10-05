import {
  skipToken,
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';
import { useSession } from '@/lib/auth-client.ts';
import { deckKeys } from './queryKeys.ts';
import { createApiError } from '@/api/errors.ts';
import { useGetDeck } from './useGetDeck.ts';
import { isSharedPrivateDeck } from './deckAccessCache.ts';
import type { DeckData } from '../../../../types/Deck.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export interface DeckCardResponse {
  data: DeckCard[];
}

export function getDeckCardsQueryOptions(
  deckId: string | undefined,
  viewerId: string | undefined,
  client: QueryClient,
  refreshOnMount = false,
) {
  const sharedPrivate = () =>
    isSharedPrivateDeck(client.getQueryData<DeckData>(deckKeys.detail(deckId, viewerId)), viewerId);
  return queryOptions<DeckCardResponse, ErrorWithStatus>({
    queryKey: deckKeys.cards(deckId, viewerId),
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id'].card.$get({
            param: {
              id: deckId,
            },
          });
          if (!response.ok) {
            throw await createApiError(response, 'Could not load deck cards');
          }
          const data = await response.json();
          return data;
        }
      : skipToken,
    retry: (count, error) => !refreshOnMount && error.status !== 404 && count < 3,
    staleTime: () => (sharedPrivate() ? 0 : Infinity),
    refetchInterval: query => (query.state.status !== 'error' && sharedPrivate() ? 30_000 : false),
    refetchOnMount: refreshOnMount ? 'always' : true,
    refetchOnWindowFocus: !refreshOnMount,
    refetchOnReconnect: !refreshOnMount,
  });
}

export const useGetDeckCards = (deckId: string | undefined, refreshOnMount = false) => {
  const session = useSession();
  const client = useQueryClient();
  const detail = useGetDeck(deckId, refreshOnMount);
  return useQuery({
    ...getDeckCardsQueryOptions(deckId, session.data?.user.id, client, refreshOnMount),
    enabled: !session.isPending && !detail.isError,
  });
};
