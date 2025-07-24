import React, { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TournamentDeckResponse,
  useGetTournamentDecks,
} from '@/api/tournaments/useGetTournamentDecks';
import { useGetTournamentMatches } from '@/api/tournaments/useGetTournamentMatches';
import { useCardList } from '@/api/lists/useCardList';
import { MatchData } from '@/components/app/tournaments/lib/tournamentLib.ts';
import { BracketInfo } from '../../../../../../types/enums.ts';
import BracketRounds from './components/BracketRounds';
import TournamentPlacements from './components/TournamentPlacements';
import DeckViewer from './components/DeckViewer';

// Map BracketInfo enum values to their corresponding numeric values
const bracketInfoToNumber: Record<BracketInfo, number> = {
  [BracketInfo.NONE]: 8,
  [BracketInfo.TOP4]: 4,
  [BracketInfo.TOP8]: 8,
  [BracketInfo.TOP16]: 16,
};

interface TournamentTopBracketProps {
  tournamentId: string;
  top?: BracketInfo;
  className?: string;
}

const TournamentTopBracket: React.FC<TournamentTopBracketProps> = ({
  tournamentId,
  top = BracketInfo.TOP8,
}) => {
  const { data: decksData, isLoading: isLoadingDecks } = useGetTournamentDecks(tournamentId);
  const { data: matchesData, isLoading: isLoadingMatches } = useGetTournamentMatches(tournamentId);
  const { data: cardListData } = useCardList();
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>();

  // Remove value from selectedDeckId on Esc key press
  // TODO - works fine, but when user closes modal (deck image, card detail,...) and wants to close it with Esc, it also closes the deck - fix it
  /*React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedDeckId(undefined);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, []);*/

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

  // Process matches to create bracket structure
  const bracketData = useMemo(() => {
    if (!matchesData?.data || !topDecks.length) return null;

    // Get the final round matches
    const roundNumbers = [...new Set(matchesData.data.map(m => m.round))].sort((a, b) => b - a);
    setRounds(roundNumbers);

    const playerIdMap = new Map();

    // Map deck IDs to player data
    topDecks.forEach(deck => {
      const meleeUsername = deck.tournamentDeck.meleePlayerUsername;
      if (meleeUsername) {
        playerIdMap.set(meleeUsername, deck);
      }
    });

    // We need to identify the final rounds
    const requiredRounds = Math.log2(bracketInfoToNumber[top]);
    let finalRounds = roundNumbers.slice(0, requiredRounds);

    // If we don't have enough rounds in the data, we might need padding
    while (finalRounds.length < requiredRounds) {
      finalRounds.push(-1); // Placeholder for missing rounds
    }

    // Process matches by round and organize them properly
    const processedRounds = [];

    // Process finals first (last round)
    const finalsRound = finalRounds[0];
    const finalsMatches = matchesData.data
      .filter(m => m.round === finalsRound)
      .filter(m => !m.isBye)
      .map(match => {
        const player1 = playerIdMap.get(match.p1Username);
        const player2 = match.p2Username ? playerIdMap.get(match.p2Username) : null;

        return {
          round: finalsRound,
          match: match,
          player1,
          player2,
          winner: match.result === 3 ? player1 : match.result === 0 ? player2 : null,
          p1Username: match.p1Username,
          p2Username: match.p2Username,
          gameWins: match.gameWin || 0,
          gameLosses: match.gameLose || 0,
          gameDraws: match.gameDraw || 0,
        };
      });

    processedRounds.push(finalsMatches);

    // Process earlier rounds (semifinals, quarterfinals)
    for (let i = 1; i < requiredRounds; i++) {
      const roundNumber = finalRounds[i];

      if (roundNumber >= 0) {
        // Get matches for this round
        const roundMatches = matchesData.data
          .filter(m => m.round === roundNumber)
          .filter(m => !m.isBye);

        // Find champions from this round to maintain bracket continuity
        const champions = new Set();
        roundMatches.forEach(match => {
          if (match.result === 3) {
            champions.add(match.p1Username);
          } else if (match.result === 0) {
            champions.add(match.p2Username);
          }
        });

        // Previous round matches (already processed)
        const prevRoundMatches = processedRounds[i - 1];

        // Organize matches to maintain bracket continuity
        const organizedMatches: MatchData[] = [];

        // For each previous round match
        prevRoundMatches.forEach(prevMatch => {
          // Find matches that feed into this previous match
          const player1Matches = roundMatches.filter(
            m =>
              (m.result === 3 && m.p1Username === prevMatch.p1Username) ||
              (m.result === 0 && m.p2Username === prevMatch.p1Username),
          );

          const player2Matches = roundMatches.filter(
            m =>
              (m.result === 3 && m.p1Username === prevMatch.p2Username) ||
              (m.result === 0 && m.p2Username === prevMatch.p2Username),
          );

          // Add player 1's previous match
          if (player1Matches.length > 0) {
            const match = player1Matches[0];
            organizedMatches.push({
              round: roundNumber,
              match: match,
              player1: playerIdMap.get(match.p1Username),
              player2: match.p2Username ? playerIdMap.get(match.p2Username) : null,
              winner:
                match.result === 3
                  ? playerIdMap.get(match.p1Username)
                  : match.result === 0
                    ? playerIdMap.get(match.p2Username)
                    : null,
              p1Username: match.p1Username,
              p2Username: match.p2Username,
              gameWins: match.gameWin || 0,
              gameLosses: match.gameLose || 0,
              gameDraws: match.gameDraw || 0,
            });
          }

          // Add player 2's previous match
          if (player2Matches.length > 0) {
            const match = player2Matches[0];
            organizedMatches.push({
              round: roundNumber,
              match: match,
              player1: playerIdMap.get(match.p1Username),
              player2: match.p2Username ? playerIdMap.get(match.p2Username) : null,
              winner:
                match.result === 3
                  ? playerIdMap.get(match.p1Username)
                  : match.result === 0
                    ? playerIdMap.get(match.p2Username)
                    : null,
              p1Username: match.p1Username,
              p2Username: match.p2Username,
              gameWins: match.gameWin || 0,
              gameLosses: match.gameLose || 0,
              gameDraws: match.gameDraw || 0,
            });
          }
        });

        // If organizedMatches doesn't contain all matches from this round, add the missing ones
        const organizedMatchesUsernames = new Set();
        organizedMatches.forEach(m => {
          organizedMatchesUsernames.add(m.p1Username);
          if (m.p2Username) organizedMatchesUsernames.add(m.p2Username);
        });

        const missingMatches = roundMatches.filter(
          m =>
            !organizedMatchesUsernames.has(m.p1Username) &&
            (!m.p2Username || !organizedMatchesUsernames.has(m.p2Username)),
        );

        missingMatches.forEach(match => {
          organizedMatches.push({
            round: roundNumber,
            match: match,
            player1: playerIdMap.get(match.p1Username),
            player2: match.p2Username ? playerIdMap.get(match.p2Username) : null,
            winner:
              match.result === 3
                ? playerIdMap.get(match.p1Username)
                : match.result === 0
                  ? playerIdMap.get(match.p2Username)
                  : null,
            p1Username: match.p1Username,
            p2Username: match.p2Username,
            gameWins: match.gameWin || 0,
            gameLosses: match.gameLose || 0,
            gameDraws: match.gameDraw || 0,
          });
        });

        processedRounds.push(organizedMatches);
      } else {
        // Missing round data - add placeholder
        processedRounds.push([]);
      }
    }

    return processedRounds.reverse(); // Reverse to start with earlier rounds
  }, [matchesData, topDecks, top]);

  // These functions have been moved to separate components

  if (isLoadingDecks || isLoadingMatches) {
    return (
      <div className="w-full p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!topDecks.length) {
    return null;
  }

  return (
    <div className="bg-card rounded-md border shadow-sm p-3">
      <div className="flex flex-col lg:flex-row gap-4">
        {selectedDeckId ? (
          <DeckViewer selectedDeckId={selectedDeckId} setSelectedDeckId={setSelectedDeckId} />
        ) : top === BracketInfo.NONE ? (
          // For "none" bracket type, don't show the bracket rounds
          <></>
        ) : (
          <BracketRounds
            bracketData={bracketData}
            rounds={rounds}
            top={top}
            highlightedPlayer={highlightedPlayer}
            setHighlightedPlayer={setHighlightedPlayer}
            setSelectedDeckId={setSelectedDeckId}
            cardListData={cardListData}
          />
        )}
        <TournamentPlacements
          topDecks={topDecks}
          top={top}
          highlightedPlayer={highlightedPlayer}
          setHighlightedPlayer={setHighlightedPlayer}
          selectedDeckId={selectedDeckId}
          setSelectedDeckId={setSelectedDeckId}
          cardListData={cardListData}
        />
      </div>
    </div>
  );
};

export default TournamentTopBracket;
