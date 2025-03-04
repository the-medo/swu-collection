import { useGetUserDecks } from '@/api/user/useGetUserDecks.ts';
import DeckTable from '../DeckTable/DeckTable.tsx';
import { useMemo } from 'react';
import { useGetUser } from '@/api/user/useGetUser.ts';
import { UserDeckData } from '../DeckTable/deckTableLib.tsx';

interface UserDecksProps {
  userId: string | undefined;
  loading?: boolean;
}

const UserDecks: React.FC<UserDecksProps> = ({ userId, loading = false }) => {
  const { data: user, isFetching: isFetchingUser } = useGetUser(userId);
  const { data, isFetching } = useGetUserDecks(userId);

  const isLoading = isFetching || loading || isFetchingUser;

  const decks: UserDeckData[] = useMemo(() => {
    if (user && data) {
      return data.decks.map(d => ({
        deck: d,
        user,
      }));
    }
    return [];
  }, [user, data]);

  return <DeckTable variant="user" decks={decks} loading={isLoading} />;
};

export default UserDecks;
