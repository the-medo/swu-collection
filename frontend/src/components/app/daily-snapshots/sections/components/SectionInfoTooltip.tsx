import * as React from 'react';
import { AlertCircle, Info, Grid2X2Check, Grid2x2X } from 'lucide-react';
import type { DailySnapshotRow } from '@/api/daily-snapshot';
import type { TournamentGroupExtendedInfo } from '../../../../../../../types/DailySnapshots.ts';
import TournamentGroupExtendedInfoTable from './TournamentGroupExtendedInfoTable.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { cn } from '@/lib/utils.ts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';

export interface SectionInfoTooltipProps {
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
  tournamentGroupExtendedInfo: TournamentGroupExtendedInfo[];
  sectionDataWarning?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const formatDateTime = (val?: string | null): string | null => {
  if (!val) return null;
  const date = new Date(val);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export const INCOMPLETE_DATA_PERCENTAGE = 0.8;

export const SectionInfoTooltip: React.FC<SectionInfoTooltipProps> = ({
  dailySnapshot,
  sectionUpdatedAt,
  tournamentGroupExtendedInfo,
  sectionDataWarning,
  children,
  className,
}) => {
  const secUpdated = formatDateTime(sectionUpdatedAt);
  const snapUpdated = formatDateTime(dailySnapshot?.updatedAt ?? undefined);

  const hasLowCoverage = Array.isArray(tournamentGroupExtendedInfo)
    ? tournamentGroupExtendedInfo.some(item => {
        const twd = item?.tournamentGroupStats?.tournamentsWithData;
        const total = item?.tournamentGroupStats?.totalTournaments;
        if (typeof twd !== 'number' || typeof total !== 'number' || total === 0) return false;
        return twd / total < INCOMPLETE_DATA_PERCENTAGE;
      })
    : false;

  const triggerDataWarning = Boolean(sectionDataWarning && hasLowCoverage);

  return (
    <div className="inline-flex items-center gap-1 pt-1">
      <Popover hover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Section info"
            className={cn(
              'inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors',
              className,
            )}
          >
            <Info className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        {children ? (
          <PopoverContent className="p-3 max-w-[300px]">
            <div className="flex flex-col gap-3 text-sm">{children}</div>
          </PopoverContent>
        ) : null}
      </Popover>

      {/* Second tooltip: everything else, Grid icons based on data warning */}
      <Popover hover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Section data coverage info"
            className={cn(
              'inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors',
              className,
            )}
          >
            {triggerDataWarning ? (
              <Grid2x2X className="size-4 dark:text-orange-300 text-orange-600" />
            ) : (
              <Grid2X2Check className="size-4 dark:text-green-300 text-green-600" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-4 w-auto max-w-[min(100vw,500px)]">
          <div className="flex flex-col gap-3">
            {/* Data warning */}
            {triggerDataWarning ? (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4 text-yellow-500 stroke-yellow-500" />
                <AlertTitle className="text-sm">Data may be incomplete</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc ml-5 space-y-1">
                    <li>
                      At least one of the tournament groups has less than{' '}
                      {INCOMPLETE_DATA_PERCENTAGE * 100}% of tournaments with data.
                    </li>
                    <li>
                      It can take some time to import data after tournaments end and not all
                      tournaments provide this data (data from weekend is usually ready on following
                      monday evening EU time)
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Tournament groups table */}
            <div className={cn('flex flex-col gap-1 mt-4 pt-2', triggerDataWarning && 'border-t')}>
              <span className="text-xs">
                The table below lists tournament groups that provided the data and how complete the
                data is. You can open them to see more detailed statistics and list of tournaments,
                they are computed from.
              </span>
              <TournamentGroupExtendedInfoTable
                items={tournamentGroupExtendedInfo ?? []}
                sectionDataWarning={sectionDataWarning}
              />
            </div>

            {/* Times info */}
            <div className="flex flex-row justify-between items-center text-xs text-muted-foreground">
              {secUpdated ? (
                <div>
                  Section updated at: <span className=" text-foreground">{secUpdated}</span>
                </div>
              ) : null}
              {snapUpdated ? (
                <div>
                  Daily snapshot updated at: <span className="text-foreground">{snapUpdated}</span>
                </div>
              ) : null}
              {!secUpdated && !snapUpdated ? (
                <div>No update time information available.</div>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SectionInfoTooltip;
