import React, { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Trophy, X } from 'lucide-react';
import {
  TournamentDeckResponse,
  useGetTournamentDecks,
} from '@/api/tournaments/useGetTournamentDecks';
import { useGetTournamentMatches } from '@/api/tournaments/useGetTournamentMatches';
import { useGetTournament } from '@/api/tournaments/useGetTournament';
import { useCardList } from '@/api/lists/useCardList';
import { cn } from '@/lib/utils';
import CardImage from '@/components/app/global/CardImage';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant';
import { transformTopPlacementsAccordingToAttendance } from '../lib/tournament-attendance-vs-top';
import { extractDeckNameFromBrackets } from '../lib/extractDeckNameFromBrackets';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';
import DeckContents from '@/components/app/decks/DeckContents/DeckContents.tsx';
import { MatchData } from '@/components/app/tournaments/lib/tournamentLib.ts';

interface TournamentTopBracketProps {
  tournamentId: string;
  top?: 4 | 8;
  className?: string;
}

const TournamentTopBracket: React.FC<TournamentTopBracketProps> = ({ tournamentId, top = 8 }) => {
  const { data: tournamentData } = useGetTournament(tournamentId);
  const { data: decksData, isLoading: isLoadingDecks } = useGetTournamentDecks(tournamentId);
  const { data: matchesData, isLoading: isLoadingMatches } = useGetTournamentMatches(tournamentId);
  const { data: cardListData } = useCardList();
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>();

  const attendance = tournamentData?.tournament?.attendance || 0;

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

  // Determine actual top to display based on attendance
  const actualTop = useMemo(() => {
    if (attendance > 0) {
      return transformTopPlacementsAccordingToAttendance(attendance, top) || top;
    }
    return top;
  }, [attendance, top]);

  // Extract top placements
  const topDecks = useMemo(() => {
    if (!decksData || !('data' in decksData)) return [];

    // Sort by placement
    const sortedDecks: TournamentDeckResponse[] = [...decksData.data]
      .filter(d => d.tournamentDeck.placement !== null && d.tournamentDeck.placement <= actualTop)
      .sort((a, b) => (a.tournamentDeck.placement || 99) - (b.tournamentDeck.placement || 99));

    return sortedDecks;
  }, [decksData, actualTop]);

  // Process matches to create bracket structure
  const bracketData = useMemo(() => {
    console.log({ matchesData, topDecks });
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
    const requiredRounds = Math.log2(actualTop);
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

        // Find winners from this round to maintain bracket continuity
        const winners = new Set();
        roundMatches.forEach(match => {
          if (match.result === 3) {
            winners.add(match.p1Username);
          } else if (match.result === 0) {
            winners.add(match.p2Username);
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
  }, [matchesData, topDecks, actualTop]);

  // Create structured placements for the sidebar
  const placements = useMemo(() => {
    if (!topDecks.length) return [];

    const result = [];

    // Winner (1st place)
    if (topDecks[0]) {
      result.push({
        placement: '1st',
        decks: [topDecks[0]],
      });
    }

    // Runner-up (2nd place)
    if (topDecks.length > 1 && topDecks[1]) {
      result.push({
        placement: '2nd',
        decks: [topDecks[1]],
      });
    }

    // 3rd-4th places
    const thirdFourthDecks = topDecks.filter(
      d => d.tournamentDeck.placement === 3 || d.tournamentDeck.placement === 4,
    );
    if (thirdFourthDecks.length) {
      result.push({
        placement: '3rd-4th',
        decks: thirdFourthDecks,
      });
    }

    // 5th-8th places if top 8
    if (actualTop >= 8) {
      const fifthToEighthDecks = topDecks.filter(
        d => (d.tournamentDeck.placement ?? 0) >= 5 && (d.tournamentDeck.placement ?? 0) <= 8,
      );
      if (fifthToEighthDecks.length) {
        result.push({
          placement: '5th-8th',
          decks: fifthToEighthDecks,
        });
      }
    }

    return result;
  }, [topDecks, actualTop]);

  // Render a player entry in the bracket
  const renderPlayer = (
    deck: TournamentDeckResponse,
    isWinner = false,
    showScore = false,
    gameWins = 0,
  ) => {
    if (!deck)
      return (
        <div className="h-16 rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground px-4">
          TBD
        </div>
      );

    const username = deck.tournamentDeck.meleePlayerUsername || 'Unknown';
    const isHighlighted = highlightedPlayer === username;

    // Get leader and base card info
    const leaderCard = deck.deck?.leaderCardId1
      ? cardListData?.cards[deck.deck.leaderCardId1]
      : undefined;
    const baseCard = deck.deck?.baseCardId ? cardListData?.cards[deck.deck.baseCardId] : undefined;

    return (
      <div
        className={cn(
          'flex p-2 border rounded-md gap-2 transition-colors duration-200 min-w-72',
          isWinner ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
          isHighlighted ? 'bg-amber-500/20 border-amber-500' : '',
        )}
        onMouseEnter={() => setHighlightedPlayer(username)}
        onMouseLeave={() => setHighlightedPlayer(null)}
        onClick={() => setSelectedDeckId(deck.tournamentDeck.deckId)}
      >
        <div className="flex gap-1 flex-shrink-0">
          {leaderCard && (
            <CardImage
              card={leaderCard}
              cardVariantId={leaderCard ? selectDefaultVariant(leaderCard) : undefined}
              forceHorizontal={true}
              size="w50"
              backSideButton={false}
            />
          )}
          {baseCard && (
            <div className="-ml-2">
              <CardImage
                card={baseCard}
                cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
                forceHorizontal={true}
                size="w50"
                backSideButton={false}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center overflow-hidden">
          <div
            className={cn(
              'font-medium whitespace-nowrap text-sm overflow-hidden text-ellipsis  max-w-32',
              isHighlighted ? 'text-amber-700 dark:text-amber-300' : '',
            )}
          >
            {username}
          </div>
          {deck.deck && deck.deck.name && (
            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-32">
              {extractDeckNameFromBrackets(deck.deck.name)}
            </div>
          )}
        </div>
        {showScore && (
          <div
            className={cn(
              'ml-auto px-2 py-1 flex items-center justify-center rounded-md text-lg font-bold flex-shrink-0 min-w-8 self-stretch flex items-center justify-center',
              isWinner
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            )}
          >
            {gameWins}
          </div>
        )}
        {isWinner && deck.tournamentDeck.placement === 1 && !showScore && (
          <Trophy className="h-4 w-4 text-amber-500 ml-auto flex-shrink-0" />
        )}
      </div>
    );
  };

  // Render tournament standings/placements column
  const renderPlacements = () => {
    return (
      <div className="min-w-72 space-y-4 mr-6">
        <h3 className="text-lg font-bold">Final Standings</h3>
        {placements.map((placementGroup, index) => (
          <div key={index} className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {placementGroup.placement}
            </h4>
            {placementGroup.decks.map(deck => {
              const username = deck.tournamentDeck.meleePlayerUsername || 'Unknown';
              const isHighlighted =
                highlightedPlayer === username || selectedDeckId === deck.tournamentDeck.deckId;

              // Get leader and base card info
              const leaderCard = deck.deck?.leaderCardId1
                ? cardListData?.cards[deck.deck.leaderCardId1]
                : undefined;
              const baseCard = deck.deck?.baseCardId
                ? cardListData?.cards[deck.deck.baseCardId]
                : undefined;

              return (
                <div
                  key={deck.tournamentDeck.deckId}
                  className={cn(
                    'p-2 rounded-md transition-colors border flex gap-2 items-center cursor-pointer',
                    isHighlighted
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500'
                      : 'hover:bg-muted/50 border-transparent',
                  )}
                  onMouseEnter={() => setHighlightedPlayer(username)}
                  onMouseLeave={() => setHighlightedPlayer(null)}
                  onClick={() => setSelectedDeckId(deck.tournamentDeck.deckId)}
                >
                  <div className="flex gap-1 flex-shrink-0">
                    {leaderCard && (
                      <CardImage
                        card={leaderCard}
                        cardVariantId={leaderCard ? selectDefaultVariant(leaderCard) : undefined}
                        forceHorizontal={true}
                        size="w50"
                        backSideButton={false}
                      />
                    )}
                    {baseCard && (
                      <div className="-ml-2">
                        <CardImage
                          card={baseCard}
                          cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
                          forceHorizontal={true}
                          size="w50"
                          backSideButton={false}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center overflow-hidden">
                    <div className="font-medium">
                      {username}
                      {deck.tournamentDeck.placement === 1 && (
                        <Trophy className="h-4 w-4 text-amber-500 inline ml-2" />
                      )}
                    </div>
                    {deck.deck && deck.deck.name && (
                      <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-32">
                        {extractDeckNameFromBrackets(deck.deck.name)}
                      </div>
                    )}
                  </div>
                  {deck.deck && deck.deck.id && (
                    <Button size="iconSmall" variant="outline" title="Open deck in new tab">
                      <Link to={'/decks/$deckId'} params={{ deckId: deck.deck.id }} target="_blank">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (isLoadingDecks || isLoadingMatches) {
    return (
      <div className="w-full p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!topDecks.length) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-muted-foreground">No tournament data available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {selectedDeckId ? (
        <div className="flex-1 mt-8 lg:mt-0 relative">
          <Button
            variant="outline"
            size="iconSmall"
            className="absolute top-2 right-2"
            onClick={() => setSelectedDeckId(undefined)}
          >
            <X />
          </Button>
          <DeckContents deckId={selectedDeckId} />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto mt-8 lg:mt-0">
          <div className="flex min-w-max gap-4">
            {bracketData &&
              bracketData.map((round, roundIndex) => (
                <div key={roundIndex} className="flex flex-col w-72">
                  <h4 className="text-center font-medium mb-4 text-muted-foreground">
                    {roundIndex === 0 && actualTop === 8
                      ? 'Quarterfinals'
                      : roundIndex === 0 && actualTop === 4
                        ? 'Semifinals'
                        : roundIndex === 1 && actualTop === 8
                          ? 'Semifinals'
                          : roundIndex === bracketData.length - 1
                            ? 'Finals'
                            : `Round ${rounds[roundIndex]}`}
                  </h4>

                  <div className="flex flex-col">
                    {round.map((match, matchIndex) => {
                      const matchHeight = 2 ** roundIndex * 150; // Progressively increase the height

                      return (
                        <div
                          key={matchIndex}
                          className="flex flex-col relative"
                          style={{ height: matchHeight }}
                        >
                          <div className="flex items-center h-full">
                            <div className="flex flex-col gap-1 absolute top-1/2 -translate-y-1/2 transform">
                              {renderPlayer(
                                match.player1,
                                match.winner === match.player1,
                                true,
                                match.gameWins,
                              )}
                              <div className="h-px bg-muted-foreground/30 mx-2"></div>
                              {renderPlayer(
                                match.player2,
                                match.winner === match.player2,
                                true,
                                match.gameLosses,
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      {renderPlacements()}
    </div>
  );
};

export default TournamentTopBracket;
