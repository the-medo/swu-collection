import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { UserDecksResponse } from '../../../../server/routes/user.ts';
import { queryClient } from '@/queryClient.ts';
import { User } from '../../../../types/User.ts';
import { Deck } from '../../../../types/Deck.ts';

export type UserDeckData = {
  user: User;
  deck: Deck;
};

export const useGetUserDecks = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['decks', userId],
    queryFn: userId
      ? async () => {
          const response = await api.user[':id'].deck.$get({
            param: {
              id: userId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          const data = (await response.json()) as unknown as UserDecksResponse;
          return data;
        }
      : skipToken,
    staleTime: Infinity,
  });
};

export const updateGetUserDecks = (
  userId: string,
  updateCallback: (data: UserDecksResponse | undefined) => UserDecksResponse | undefined,
) => {
  queryClient.setQueryData<UserDecksResponse | undefined>(
    ['decks', userId],
    (oldData: UserDecksResponse | undefined) => {
      return updateCallback(oldData);
    },
  );
};
