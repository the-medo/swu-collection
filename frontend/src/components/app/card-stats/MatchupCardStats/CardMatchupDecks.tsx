import * as React from 'react';
import { useMatchupStatDecks } from '@/api/card-stats/useMatchupStatDecks';
import { useMemo } from 'react';
import TournamentDeckTable from '@/components/app/tournaments/TournamentDecks/TournamentDeckTable.tsx';

type CardMatchupDecksProps = {
  overviewId: string;
  cardId: string;
  matchupStatDeckKey: string;
};

const CardMatchupDecks: React.FC<CardMatchupDecksProps> = ({
  overviewId,
  cardId,
  matchupStatDeckKey,
}) => {
  // Use the API hook to retrieve deck data

  const { data, isLoading, error } = useMatchupStatDecks({
    overviewId,
    key: matchupStatDeckKey,
  });

  // With the new API response, we directly get the deck data
  const deckData = useMemo(() => {
    if (!data) return [];
    return data.data.decks;
  }, [data]);

  return (
    <div className="p-0">
      {isLoading && <p>Loading decks...</p>}
      {error && <p className="text-red-500">Error loading decks: {error.message}</p>}
      {data && (
        <TournamentDeckTable
          decks={deckData}
          useKeyAndKeyMetaInfo={false}
          highlightedCardId={cardId}
          deckIdSearchParam="csDeckId"
        />
      )}
    </div>
  );
};

export default CardMatchupDecks;
