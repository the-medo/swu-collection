import { useMemo } from 'react';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { UserDeckData } from '@/api/user/useGetUserDecks.ts';

interface PublicDecksProps {}

const PublicDecks: React.FC<PublicDecksProps> = ({}) => {
  const { data, isFetching } = useGetDecks({});

  const load = isFetching;

  const decks: UserDeckData[] = useMemo(() => {
    if (data) {
      return data.pages.flat();
    }
    return [];
  }, [data]);

  return (
    <>
      <DeckTable variant="public" decks={decks} loading={load} />
    </>
  );
};

export default PublicDecks;
