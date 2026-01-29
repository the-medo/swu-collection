import * as React from 'react';
import { GameResult } from '../../../../../../../server/db/schema/game_result.ts';
import GameRow from './GameRow.tsx';

interface MatchGamesProps {
  games: GameResult[];
}

const MatchGames: React.FC<MatchGamesProps> = ({ games }) => {
  return (
    <div className="flex flex-col border-l border-border/40 h-full min-w-[150px]">
      {games.map((game, index) => (
        <GameRow key={game.id || index} game={game} index={index} />
      ))}
    </div>
  );
};

export default MatchGames;
