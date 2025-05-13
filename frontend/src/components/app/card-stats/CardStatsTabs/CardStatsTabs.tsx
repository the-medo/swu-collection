import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import AllCardStats from '../AllCardStats/AllCardStats';
import AspectCardStats from '../AspectCardStats/AspectCardStats';
import LeaderCardStats from '../LeaderCardStats/LeaderCardStats';
import LeaderBaseCardStats from '../LeaderBaseCardStats/LeaderBaseCardStats';

export const cardStatsTabsArray: [string, ...string[]] = [
  'all',
  'aspect',
  'leader',
  'leader-base',
] as const;

interface CardStatsTabsProps {
  className?: string;
  metaId?: number;
  tournamentId?: string;
}

const CardStatsTabs: React.FC<CardStatsTabsProps> = ({ className, metaId, tournamentId }) => {
  const { csPage = 'all' } = useSearch({ strict: false });

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-4 mb-2 rounded-lg bg-muted p-1">
        {cardStatsTabsArray.map(tab => (
          <Link
            key={tab}
            to="."
            search={prev => ({ ...prev, csPage: tab, csLeaderId: undefined, csBaseId: undefined })}
            className={cn(
              'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              csPage === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'all' && 'All Cards'}
            {tab === 'aspect' && 'Aspect'}
            {tab === 'leader' && 'Leader'}
            {tab === 'leader-base' && 'Leader/Base'}
          </Link>
        ))}
      </div>

      {/* Render the appropriate component based on the selected tab */}
      {csPage === 'all' && <AllCardStats metaId={metaId} tournamentId={tournamentId} />}
      {csPage === 'aspect' && <AspectCardStats metaId={metaId} tournamentId={tournamentId} />}
      {csPage === 'leader' && <LeaderCardStats metaId={metaId} tournamentId={tournamentId} />}
      {csPage === 'leader-base' && (
        <LeaderBaseCardStats metaId={metaId} tournamentId={tournamentId} />
      )}
    </div>
  );
};

export default CardStatsTabs;
