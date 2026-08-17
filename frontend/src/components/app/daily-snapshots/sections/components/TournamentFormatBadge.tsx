import * as React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import {
  dailySnapshotFormatBadgeById,
  formatDataById,
} from '../../../../../../../types/Format.ts';

export interface TournamentFormatBadgeProps {
  formatId: number;
  className?: string;
}

const TournamentFormatBadge: React.FC<TournamentFormatBadgeProps> = ({ formatId, className }) => {
  const badge = dailySnapshotFormatBadgeById[formatId];
  if (!badge) return null;

  const formatName = formatDataById[formatId]?.name ?? 'Alternate';

  return (
    <Badge
      variant="outline"
      size="small"
      title={`${formatName} format`}
      aria-label={`${formatName} format`}
      className={cn(
        'not-italic font-bold bg-background/90',
        badge === 'E'
          ? 'border-violet-500 text-violet-700 dark:text-violet-300'
          : 'border-amber-500 text-amber-700 dark:text-amber-300',
        className,
      )}
    >
      {badge}
    </Badge>
  );
};

export default TournamentFormatBadge;
