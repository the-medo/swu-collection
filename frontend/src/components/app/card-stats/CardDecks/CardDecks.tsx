import * as React from 'react';
import { useGetCardDecks } from '@/api/cards';
import { CardStatsParams } from '@/api/card-stats';
import TournamentDeckTable from '@/components/app/tournaments/TournamentDecks/TournamentDeckTable.tsx';

type CardDecksProps = {
  cardId: string;
} & CardStatsParams;

const CardDecks: React.FC<CardDecksProps> = ({
  cardId,
  metaId,
  tournamentId,
  leaderCardId,
  baseCardId,
}) => {
  // Use the hook to fetch card decks
  const { data, isLoading, error } = useGetCardDecks({
    cardId,
    metaId,
    tournamentId,
    leaderCardId,
    baseCardId,
  });

  console.log({ data, metaId, tournamentId, leaderCardId, baseCardId });

  return (
    <div className="p-4">
      {isLoading && <p>Loading decks...</p>}
      {error && <p className="text-red-500">Error loading decks: {error.message}</p>}
      {data && <TournamentDeckTable decks={data?.data} />}
    </div>
  );
};

export default CardDecks;
