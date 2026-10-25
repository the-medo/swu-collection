import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import type { GameResult } from '../../../../../../../server/db/schema/game_result.ts';

export default function MatchGames({ games }: { games: GameResult[] }) {
  return (
    <span className={statisticsStyles.gameResults} role="group" aria-label="Game results">
      {games.map((game, index) => {
        const gameNumber = game.gameNumber ?? index + 1;
        const outcome = game.isWinner === true ? 'Win' : game.isWinner === false ? 'Loss' : 'Draw';
        return (
          <span
            key={game.id || index}
            className={statisticsStyles.gameResult}
            data-result={game.isWinner === true ? 3 : game.isWinner === false ? 0 : 1}
            role="img"
            title={`Game ${gameNumber}: ${outcome}`}
            aria-label={`Game ${gameNumber}: ${outcome}`}
          >
            <strong>{outcome[0]}</strong>
          </span>
        );
      })}
    </span>
  );
}
