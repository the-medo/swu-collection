import * as React from 'react';
import { GameResult } from '../../../../../../../server/db/schema/game_result.ts';
import { cn } from '@/lib/utils.ts';
import { getResultColor, getResultText } from '@/components/app/statistics/lib/lib.ts';
import { Badge } from '@/components/ui/badge.tsx';

interface GameRowProps {
  game: GameResult;
}

const GameRow: React.FC<GameRowProps> = ({ game }) => {
  const result = game.isWinner === true ? 3 : game.isWinner === false ? 0 : 1;

  return (
    <div className="flex items-center gap-2 py-1 px-2 border-b last:border-0 border-border/40 text-xs">
      <span className={cn('w-4 h-4 rounded', getResultColor(result))}></span>
      <span className={cn('font-medium')}>{getResultText(result)}</span>
      {game.hasInitiative !== undefined && (
        <Badge size="small" variant="outline">
          {game.hasInitiative ? 'ini' : 'no ini'}
        </Badge>
      )}
      {game.hasMulligan !== undefined && (
        <Badge size="small" variant="outline">
          {game.hasMulligan ? 'mull' : 'keep'}
        </Badge>
      )}
    </div>
  );
};

export default GameRow;
