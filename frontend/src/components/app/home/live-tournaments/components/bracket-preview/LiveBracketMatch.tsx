import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import { getLiveMatchWinnerSide } from '../../liveTournamentUtils.ts';
import { LiveBracketPlayer } from './LiveBracketPlayer.tsx';

const BASE_MATCH_HEIGHT = 180;

export function LiveBracketMatch({
  match,
  roundIndex,
  highlightedPlayerId,
  setHighlightedPlayerId,
}: {
  match: LiveTournamentMatchEntry | null;
  roundIndex: number;
  highlightedPlayerId: number | null;
  setHighlightedPlayerId: (playerId: number | null) => void;
}) {
  const winnerSide = match ? getLiveMatchWinnerSide(match) : null;
  const matchHeight = BASE_MATCH_HEIGHT * 2 ** roundIndex;

  return (
    <div className="relative flex flex-col" style={{ height: matchHeight }}>
      <div className="flex h-full items-center">
        <div className="absolute top-1/2 flex w-full -translate-y-1/2 flex-col gap-1.5">
          <LiveBracketPlayer
            player={match?.player1 ?? null}
            tournamentPlayer={match?.tournamentPlayer1 ?? null}
            gameWins={match?.match.player1GameWin ?? null}
            isWinner={winnerSide === 'player1'}
            isLoser={winnerSide === 'player2'}
            isHighlighted={highlightedPlayerId === (match?.player1?.id ?? null)}
            onMouseEnter={() => setHighlightedPlayerId(match?.player1?.id ?? null)}
            onMouseLeave={() => setHighlightedPlayerId(null)}
          />
          <LiveBracketPlayer
            player={match?.player2 ?? null}
            tournamentPlayer={match?.tournamentPlayer2 ?? null}
            gameWins={match?.match.player2GameWin ?? null}
            isWinner={winnerSide === 'player2'}
            isLoser={winnerSide === 'player1'}
            isHighlighted={highlightedPlayerId === (match?.player2?.id ?? null)}
            onMouseEnter={() => setHighlightedPlayerId(match?.player2?.id ?? null)}
            onMouseLeave={() => setHighlightedPlayerId(null)}
          />
        </div>
      </div>
    </div>
  );
}
