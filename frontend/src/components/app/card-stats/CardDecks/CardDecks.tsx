import * as React from 'react';
import { useGetCardDecks } from '@/api/cards';
import { CardStatsParams } from '@/api/card-stats';
import TournamentDeckTable from '@/components/app/tournaments/TournamentDecks/TournamentDeckTable.tsx';
import { useEffect, useMemo } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { DeckCard } from '../../../../../../server/db/schema/deck_card.ts';
import { Alert } from '@/components/ui/alert.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';

type CardDecksProps = {
  cardId: string;
} & CardStatsParams;

export type DeckCardsInfo = { deckCards?: DeckCard[] };
type TournamentDeckResponseWithCards = TournamentDeckResponse & DeckCardsInfo;
type TournamentDeckResponseWithCardsMap = Record<
  string,
  TournamentDeckResponseWithCards | undefined
>;

const CardDecks: React.FC<CardDecksProps> = ({
  cardId,
  metaId,
  tournamentId,
  tournamentGroupId,
  leaderCardId,
  baseCardId,
}) => {
  const navigate = useNavigate({ from: Route.fullPath });

  const { data, isLoading, error } = useGetCardDecks({
    cardId,
    metaId,
    tournamentId,
    tournamentGroupId,
    leaderCardId,
    baseCardId,
  });

  /**
   * We can get one deck multiple times if the card is in MD and SB.
   * Here we map entries to deckId, and add proper deckCards to it to display later in the table.
   */
  const deckTableData = useMemo(() => {
    const deckMap = (data?.data || []).reduce((acc, d) => {
      if (!acc[d.deck.id]) {
        acc[d.deck.id] = {
          deck: d.deck,
          tournamentDeck: d.tournamentDeck,
          deckInformation: d.deckInformation,
          deckCards: [],
        };
      }
      acc[d.deck.id]?.deckCards?.push(d.deckCard);

      return acc;
    }, {} as TournamentDeckResponseWithCardsMap);

    return Object.values(deckMap)
      .filter(d => d !== undefined)
      .sort((a, b) => (a.tournamentDeck.placement ?? 0) - (b.tournamentDeck.placement ?? 0));
  }, [data?.data]);

  useEffect(() => {
    if (deckTableData.length > 0) {
      void navigate({
        search: prev => ({
          ...prev,
          maDeckId: !prev.maDeckId ? deckTableData[0].deck?.id : prev.maDeckId,
        }),
      });
    }
  }, [deckTableData]);

  return (
    <div className="p-0">
      {isLoading && <p>Loading decks...</p>}
      {error && <p className="text-red-500">Error loading decks: {error.message}</p>}
      {data && (
        <TournamentDeckTable
          decks={deckTableData}
          tableHead={
            <Alert variant="info" size="xs" className="w-auto">
              Only maximum of 25 decks is shown.
            </Alert>
          }
          highlightedCardId={cardId}
        />
      )}
    </div>
  );
};

export default CardDecks;
