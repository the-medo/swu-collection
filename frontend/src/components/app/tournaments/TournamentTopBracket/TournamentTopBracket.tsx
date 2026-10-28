import React, { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import {
  TournamentDeckResponse,
  useGetTournamentDecks,
} from '@/api/tournaments/useGetTournamentDecks';
import { useGetTournamentMatches } from '@/api/tournaments/useGetTournamentMatches';
import { useGetTournament } from '@/api/tournaments/useGetTournament';
import { useCardList } from '@/api/lists/useCardList';
import { BracketInfo } from '../../../../../../types/enums.ts';
import { isLimitedFormat } from '../../../../../../types/Format.ts';
import BracketRounds from './components/BracketRounds';
import TournamentPlacements from './components/TournamentPlacements';
import DeckViewer from './components/DeckViewer';

import { buildBracket, bracketInfoToNumber } from './buildBracket.ts';

interface TournamentTopBracketProps {
  tournamentId: string;
  top?: BracketInfo;
  className?: string;
  compact?: boolean;
}

const TournamentTopBracket: React.FC<TournamentTopBracketProps> = ({
  tournamentId,
  top = BracketInfo.TOP8,
  compact,
}) => {
  const { data: decksData, isLoading: isLoadingDecks } = useGetTournamentDecks(tournamentId);
  const { data: matchesData, isLoading: isLoadingMatches } = useGetTournamentMatches(tournamentId);
  const { data: tournamentData } = useGetTournament(tournamentId);
  const limited = isLimitedFormat(tournamentData?.tournament.format ?? 0);
  const { data: cardListData } = useCardList();
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>();

  // Extract top placements
  const topDecks = useMemo(() => {
    if (!decksData || !('data' in decksData)) return [];

    const sortedDecks: TournamentDeckResponse[] = [...decksData.data]
      .filter(
        d =>
          d.tournamentDeck.placement !== null &&
          d.tournamentDeck.placement <= bracketInfoToNumber[top],
      )
      .sort((a, b) => (a.tournamentDeck.placement || 99) - (b.tournamentDeck.placement || 99));

    return sortedDecks;
  }, [decksData, top]);

  const rounds = useMemo(
    () => [...new Set(matchesData?.data.map(match => match.round) ?? [])].sort((a, b) => b - a),
    [matchesData],
  );
  const bracketData = useMemo(
    () => buildBracket(matchesData?.data ?? [], decksData?.data ?? [], top, limited),
    [matchesData, decksData, top, limited],
  );

  if (isLoadingDecks || isLoadingMatches) {
    return (
      <div className="w-full p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!topDecks.length && !bracketData) {
    return null;
  }

  return (
    <div
      className="bg-card rounded-md border shadow-xs p-3"
      data-screenshot-target="tournament-bracket"
      data-tournament-id={tournamentId}
    >
      <div className="flex flex-col lg:flex-row gap-4 justify-around flex-1">
        {selectedDeckId ? (
          <DeckViewer
            selectedDeckId={selectedDeckId}
            setSelectedDeckId={setSelectedDeckId}
            compact={compact}
          />
        ) : top === BracketInfo.NONE ? (
          // For "none" bracket type, show a message with a button to meta analysis
          <div className="flex flex-1 flex-col items-center justify-center p-6 bg-accent rounded-lg">
            <p className="text-center mb-8 italic">There is no TOP bracket for this tournament.</p>
            <p className="text-center mb-2">You can check full meta analysis instead:</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild>
                <Link to={`/tournaments/$tournamentId/meta`} params={{ tournamentId }}>
                  Meta analysis
                </Link>
              </Button>
              <Button asChild>
                <Link to={`/tournaments/$tournamentId/matchups`} params={{ tournamentId }}>
                  Matchups
                </Link>
              </Button>
              <Button asChild>
                <Link to={`/tournaments/$tournamentId/decks`} params={{ tournamentId }}>
                  All decks
                </Link>
              </Button>
              <Button asChild>
                <Link to={`/tournaments/$tournamentId/card-stats`} params={{ tournamentId }}>
                  Card statistics
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <BracketRounds
            bracketData={bracketData}
            rounds={rounds}
            top={top}
            highlightedPlayer={highlightedPlayer}
            setHighlightedPlayer={setHighlightedPlayer}
            setSelectedDeckId={setSelectedDeckId}
          />
        )}
        {topDecks.length > 0 && (
          <TournamentPlacements
            topDecks={topDecks}
            top={top}
            highlightedPlayer={highlightedPlayer}
            setHighlightedPlayer={setHighlightedPlayer}
            selectedDeckId={selectedDeckId}
            setSelectedDeckId={setSelectedDeckId}
            cardListData={cardListData}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentTopBracket;
