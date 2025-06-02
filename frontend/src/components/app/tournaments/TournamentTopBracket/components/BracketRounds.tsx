import React from 'react';
import { BracketInfo } from '../../../../../../../types/enums.ts';
import { MatchData } from '@/components/app/tournaments/lib/tournamentLib.ts';
import BracketPlayer from './BracketPlayer';

// Function to get round name based on round index and bracket type
const getRoundName = (roundIndex: number, top: BracketInfo, rounds: number[], isLastRound: boolean): string => {
  // If it's the last round, it's always the Finals
  if (isLastRound) {
    return 'Finals';
  }

  // Define round names based on bracket type and round index
  const roundNames: Record<BracketInfo, Record<number, string>> = {
    [BracketInfo.TOP16]: {
      0: 'Round of 16',
      1: 'Quarterfinals',
      2: 'Semifinals',
    },
    [BracketInfo.TOP8]: {
      0: 'Quarterfinals',
      1: 'Semifinals',
    },
    [BracketInfo.TOP4]: {
      0: 'Semifinals',
    },
    [BracketInfo.NONE]: {},
  };

  // Return the round name if it exists in the mapping, otherwise use the default format
  return roundNames[top]?.[roundIndex] || `Round ${rounds[roundIndex]}`;
};

interface BracketRoundsProps {
  bracketData: MatchData[][] | null;
  rounds: number[];
  top: BracketInfo;
  highlightedPlayer: string | null;
  setHighlightedPlayer: (username: string | null) => void;
  setSelectedDeckId: (deckId: string | undefined) => void;
  cardListData: any;
}

const BracketRounds: React.FC<BracketRoundsProps> = ({
  bracketData,
  rounds,
  top,
  highlightedPlayer,
  setHighlightedPlayer,
  setSelectedDeckId,
  cardListData,
}) => {
  if (!bracketData) return null;

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex min-w-max gap-4">
        {bracketData.map((round, roundIndex) => (
          <div key={roundIndex} className="flex flex-col w-72">
            <h4 className="text-center font-medium mb-4 text-muted-foreground">
              {getRoundName(roundIndex, top, rounds, roundIndex === bracketData.length - 1)}
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
                        <BracketPlayer
                          deck={match.player1}
                          isWinner={match.winner === match.player1}
                          showScore={true}
                          gameWins={match.gameWins}
                          isHighlighted={highlightedPlayer === match.p1Username}
                          onMouseEnter={() => setHighlightedPlayer(match.p1Username)}
                          onMouseLeave={() => setHighlightedPlayer(null)}
                          onClick={() => match.player1 && setSelectedDeckId(match.player1.tournamentDeck.deckId)}
                          cardListData={cardListData}
                        />
                        <div className="h-px bg-muted-foreground/30 mx-2"></div>
                        <BracketPlayer
                          deck={match.player2}
                          isWinner={match.winner === match.player2}
                          showScore={true}
                          gameWins={match.gameLosses}
                          isHighlighted={highlightedPlayer === match.p2Username}
                          onMouseEnter={() => match.p2Username && setHighlightedPlayer(match.p2Username)}
                          onMouseLeave={() => setHighlightedPlayer(null)}
                          onClick={() => match.player2 && setSelectedDeckId(match.player2.tournamentDeck.deckId)}
                          cardListData={cardListData}
                        />
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
  );
};

export default BracketRounds;
