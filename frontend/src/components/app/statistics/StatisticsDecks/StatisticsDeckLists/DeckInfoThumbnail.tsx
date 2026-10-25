import { areGameAndMatchRecordsEqual } from '@/components/app/statistics/lib/resultStatistics';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import * as React from 'react';
import { StatisticsDeckArtwork } from '@/components/app/statistics/common/StatisticsDeckArtwork.tsx';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { StatSection, StatSectionProps } from '@/components/app/statistics/common/StatSection.tsx';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';
import { getTeamUrlPrefix } from '@/components/app/teams/lib/getTeamUrlPrefix.ts';
import { StatSectionCompact } from '@/components/app/statistics/common/StatSectionCompact.tsx';

interface DeckInfoThumbnailProps {
  teamId?: string;
  statistics?: DeckStatistics;
  statSectionVariant?: StatSectionProps['variant'];
  displayDeckBackground?: boolean;
  compactOnMobile?: boolean;
}

const DeckInfoThumbnail: React.FC<DeckInfoThumbnailProps> = ({
  teamId,
  statistics,
  statSectionVariant = 'vertical',
  displayDeckBackground = true,
  compactOnMobile = false,
}) => {
  const deckId = statistics?.deckId;
  const deckName = statistics?.deckName;
  const leaderCardId = statistics?.leaderCardId;
  const baseCardKey = statistics?.baseCardKey;
  const matchWinrate = statistics?.matchWinrate;
  const gameWinrate = statistics?.gameWinrate;
  const matchWins = statistics?.matchWins;
  const matchLosses = statistics?.matchLosses;
  const gameWins = statistics?.gameWins;
  const gameLosses = statistics?.gameLosses;
  const gameAndMatchRecordsAreEqual = statistics ? areGameAndMatchRecordsEqual(statistics) : false;

  if (!statistics) return null;
  return (
    <article className={cn('group/deck-row', statisticsStyles.deckRow, statisticsStyles.deckEntry)}>
      {displayDeckBackground && (
        <StatisticsDeckArtwork leaderId={leaderCardId} baseKey={baseCardKey} />
      )}
      <div className="min-w-0 flex-1 basis-32">
        <Link
          className={cn('block text-sm font-semibold', statisticsStyles.deckLink)}
          to={`${getTeamUrlPrefix(teamId)}/statistics/decks`}
          params={{ teamId }}
          search={prev => ({ ...prev, sDeckId: deckId })}
        >
          <span className="line-clamp-2">{deckName || 'Untitled deck'}</span>
        </Link>
      </div>
      <div
        className={cn(
          'min-w-0 flex-1 basis-64',
          statisticsStyles.deckRecords,
          gameAndMatchRecordsAreEqual && 'grid-cols-1',
          compactOnMobile && statisticsStyles.deckRecordsCompact,
        )}
      >
        <StatSection
          label="Games"
          total={statistics.totalGames}
          wins={gameWins}
          losses={gameLosses}
          draws={statistics.gameDraws}
          winrate={gameWinrate}
          variant={statSectionVariant}
        />
        {!gameAndMatchRecordsAreEqual && (
          <StatSection
            label="Matches"
            total={statistics.totalMatches}
            wins={matchWins}
            losses={matchLosses}
            draws={statistics.matchDraws}
            winrate={matchWinrate}
            variant={statSectionVariant}
          />
        )}
      </div>
      {compactOnMobile && (
        <div className="flex flex-wrap gap-3 sm:hidden">
          <StatSectionCompact
            label="Games"
            wins={gameWins}
            losses={gameLosses}
            draws={statistics.gameDraws}
            winrate={gameWinrate}
          />
          {!gameAndMatchRecordsAreEqual && (
            <StatSectionCompact
              label="Matches"
              wins={matchWins}
              losses={matchLosses}
              draws={statistics.matchDraws}
              winrate={matchWinrate}
            />
          )}
        </div>
      )}
      {deckId && (
        <div className="relative z-2">
          <CopyLinkButton deckId={deckId} isPublic compact size="iconMedium" />
        </div>
      )}
    </article>
  );
};

export default DeckInfoThumbnail;
