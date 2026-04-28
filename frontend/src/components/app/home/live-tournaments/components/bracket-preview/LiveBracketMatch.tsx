import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import { getLiveMatchWinnerSide } from '../../liveTournamentUtils.ts';
import { LiveBracketPlayer } from './LiveBracketPlayer.tsx';

const BASE_MATCH_HEIGHT = 180;

export function LiveBracketMatch({
  match,
  roundIndex,
  highlightedPlayerDisplayName,
  selectedDeckId,
  setHighlightedPlayerDisplayName,
  setSelectedDeckId,
}: {
  match: LiveTournamentMatchEntry | null;
  roundIndex: number;
  highlightedPlayerDisplayName: string | null;
  selectedDeckId: string | undefined;
  setHighlightedPlayerDisplayName: (playerDisplayName: string | null) => void;
  setSelectedDeckId: (deckId: string | undefined) => void;
}) {
  const winnerSide = match ? getLiveMatchWinnerSide(match) : null;
  const matchHeight = BASE_MATCH_HEIGHT * 2 ** roundIndex;
  const player1DeckId = match?.deck1?.id;
  const player2DeckId = match?.deck2?.id;

  return (
    <div className="relative flex flex-col" style={{ height: matchHeight }}>
      <div className="flex h-full items-center">
        <div className="absolute top-1/2 flex w-full -translate-y-1/2 flex-col gap-1.5">
          <LiveBracketPlayer
            player={match?.player1 ?? null}
            tournamentPlayer={match?.tournamentPlayer1 ?? null}
            deck={match?.deck1 ?? null}
            gameWins={match?.match.player1GameWin ?? null}
            isWinner={winnerSide === 'player1'}
            isLoser={winnerSide === 'player2'}
            isHighlighted={highlightedPlayerDisplayName === (match?.player1?.displayName ?? null)}
            isSelected={selectedDeckId === player1DeckId}
            onClick={player1DeckId ? () => setSelectedDeckId(player1DeckId) : undefined}
            onMouseEnter={() =>
              setHighlightedPlayerDisplayName(match?.player1?.displayName ?? null)
            }
            onMouseLeave={() => setHighlightedPlayerDisplayName(null)}
          />
          <LiveBracketPlayer
            player={match?.player2 ?? null}
            tournamentPlayer={match?.tournamentPlayer2 ?? null}
            deck={match?.deck2 ?? null}
            gameWins={match?.match.player2GameWin ?? null}
            isWinner={winnerSide === 'player2'}
            isLoser={winnerSide === 'player1'}
            isHighlighted={highlightedPlayerDisplayName === (match?.player2?.displayName ?? null)}
            isSelected={selectedDeckId === player2DeckId}
            onClick={player2DeckId ? () => setSelectedDeckId(player2DeckId) : undefined}
            onMouseEnter={() =>
              setHighlightedPlayerDisplayName(match?.player2?.displayName ?? null)
            }
            onMouseLeave={() => setHighlightedPlayerDisplayName(null)}
          />
        </div>
      </div>
    </div>
  );
}
