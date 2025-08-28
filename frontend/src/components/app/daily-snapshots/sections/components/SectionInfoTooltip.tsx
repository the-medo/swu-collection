import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { DailySnapshotRow } from '@/api/daily-snapshot';
import type { TournamentGroupExtendedInfo } from '../../../../../../../types/DailySnapshots.ts';
import TournamentGroupExtendedInfoTable from './TournamentGroupExtendedInfoTable.tsx';

export interface SectionInfoTooltipProps {
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
  tournamentGroupExtendedInfo: TournamentGroupExtendedInfo[];
  children?: React.ReactNode;
  className?: string;
}

const formatDateTime = (val?: string | null): string | null => {
  if (!val) return null;
  const date = new Date(val);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export const SectionInfoTooltip: React.FC<SectionInfoTooltipProps> = ({
  dailySnapshot,
  sectionUpdatedAt,
  tournamentGroupExtendedInfo,
  children,
  className,
}) => {
  const secUpdated = formatDateTime(sectionUpdatedAt);
  const snapUpdated = formatDateTime(dailySnapshot?.updatedAt ?? undefined);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Section info"
            className={['inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors', className]
              .filter(Boolean)
              .join(' ')}
          >
            <Info className="size-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="p-4 max-w-xl">
          <div className="flex flex-col gap-3">
            {/* Children on top */}
            {children ? <div>{children}</div> : null}

            {/* Tournament groups table */}
            <div>
              <TournamentGroupExtendedInfoTable items={tournamentGroupExtendedInfo ?? []} />
            </div>

            {/* Times info */}
            <div className="text-xs text-muted-foreground space-y-1">
              {secUpdated ? (
                <div>Section updated at: <span className="font-medium text-foreground">{secUpdated}</span></div>
              ) : null}
              {snapUpdated ? (
                <div>Daily snapshot updated at: <span className="font-medium text-foreground">{snapUpdated}</span></div>
              ) : null}
              {!secUpdated && !snapUpdated ? <div>No update time information available.</div> : null}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SectionInfoTooltip;
