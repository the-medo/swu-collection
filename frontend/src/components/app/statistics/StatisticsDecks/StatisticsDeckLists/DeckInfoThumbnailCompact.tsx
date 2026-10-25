import { areGameAndMatchRecordsEqual } from '@/components/app/statistics/lib/resultStatistics';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { StatSectionCompact } from '@/components/app/statistics/common/StatSectionCompact.tsx';
import { Link } from '@tanstack/react-router';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';
import { getTeamUrlPrefix } from '@/components/app/teams/lib/getTeamUrlPrefix.ts';

interface DeckInfoThumbnailCompactProps {
  teamId?: string;
  statistics: DeckStatistics | undefined;
}

const DeckInfoThumbnailCompact: React.FC<DeckInfoThumbnailCompactProps> = ({
  teamId,
  statistics,
}) => {
  if (!statistics) return null;

  const {
    deckId,
    deckName,
    matchWinrate,
    gameWinrate,
    matchWins,
    matchLosses,
    gameWins,
    gameLosses,
  } = statistics;

  return (
    <div className={cn(statisticsStyles.deckRow, statisticsStyles.relatedDeck)}>
      <div className="min-w-0 flex-1">
        <Link
          className={cn('block truncate text-xs font-semibold', statisticsStyles.deckLink)}
          to={`${getTeamUrlPrefix(teamId)}/statistics/decks`}
          params={{ teamId }}
          search={prev => ({ ...prev, sDeckId: deckId })}
        >
          {deckName || 'Untitled deck'}
        </Link>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <StatSectionCompact
            label="Games"
            wins={gameWins}
            losses={gameLosses}
            draws={statistics.gameDraws}
            winrate={gameWinrate}
          />
          {!areGameAndMatchRecordsEqual(statistics) && (
            <StatSectionCompact
              label="Matches"
              wins={matchWins}
              losses={matchLosses}
              draws={statistics.matchDraws}
              winrate={matchWinrate}
            />
          )}
        </div>
      </div>
      <div className="relative z-2">
        <CopyLinkButton deckId={deckId} isPublic compact />
      </div>
    </div>
  );
};

export default DeckInfoThumbnailCompact;
