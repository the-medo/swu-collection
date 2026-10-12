import { ExternalLink } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getMatchesRemainingLabel, getPlayerCount, getRoundLabel } from '../liveTournamentUtils.ts';
import { formatDataById } from '../../../../../../../types/Format.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';

export function TournamentInfoRow({
  entry,
  meleeUrl,
  showProgress,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  meleeUrl: string | null;
  showProgress: boolean;
}) {
  const countryCode = entry.tournament.location as CountryCode | undefined;
  const formatLabel = formatDataById[entry.tournament.format]?.name ?? 'Unknown format';
  const progressLabel = showProgress
    ? [getRoundLabel(entry), getMatchesRemainingLabel(entry)].filter(Boolean).join(' · ')
    : null;

  return (
    <div className="live-event-info flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {countryCode && <Flag countryCode={countryCode} className="h-3 w-5 rounded-sm" />}
        <span>{entry.tournament.location || 'Country unknown'}</span>
        <span>-</span>
        <span>{getPlayerCount(entry)}</span>
      </span>
      <span>{formatLabel}</span>
      {meleeUrl ? (
        <a
          href={meleeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex gap-1 items-center underline"
        >
          Melee
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <span>Melee missing</span>
      )}
      {progressLabel && <span>{progressLabel}</span>}
    </div>
  );
}
