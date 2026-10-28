import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import UpcomingBadge from './UpcomingBadge';
import { DISCORD_LINK } from '../../../../../../shared/consts/constants.ts';
import { isLimitedFormat } from '../../../../../../types/Format.ts';

interface NoTournamentDataProps {
  tournamentId: string;
  compact?: boolean;
}

const NoTournamentData: React.FC<NoTournamentDataProps> = ({ tournamentId, compact = false }) => {
  const { data, isFetching } = useGetTournament(tournamentId);

  if (isFetching) {
    return null;
  }

  if (!data) {
    return null;
  }

  const tournament = data.tournament;
  if (tournament.imported && isLimitedFormat(tournament.format)) return null;

  // Check if tournament is in the future
  const tournamentDate = new Date(tournament.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
  const isUpcoming = tournamentDate > today;

  if (compact) {
    if (tournament.imported && data.decks?.length) return null;
    const upcoming = !tournament.imported && isUpcoming;
    return (
      <div
        className={cn(
          'rounded-lg border px-2.5 py-2 text-xs',
          upcoming ? 'border-primary/15 bg-primary/5' : 'border-amber-500/25 bg-amber-500/5',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AlertCircle
            className={cn(
              'size-3.5 shrink-0',
              upcoming ? 'text-primary' : 'text-amber-700 dark:text-amber-400',
            )}
            aria-hidden="true"
          />
          <span className="mr-auto font-medium">
            {upcoming
              ? 'Upcoming tournament'
              : tournament.imported
                ? 'No data'
                : 'Not imported yet'}
          </span>
          {upcoming && (
            <UpcomingBadge
              date={tournament.date}
              showTooltip
              className="bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary"
            />
          )}
        </div>
        {!upcoming && (
          <p className="mt-1 mb-0 text-xs leading-snug! text-muted-foreground">
            {tournament.imported
              ? 'No deck data is available for this tournament.'
              : 'Results have not been imported yet.'}{' '}
            If results are available on Melee, share the link on{' '}
            <a
              href={DISCORD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Discord
            </a>
            .
          </p>
        )}
      </div>
    );
  }

  // If tournament is imported, don't show the alert
  if (tournament.imported) {
    // If tournament is imported but we still need to show "No data" message
    if (!data.decks || data.decks.length === 0) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4 text-yellow-600 stroke-yellow-600 dark:text-yellow-400 dark:stroke-yellow-400" />
          <AlertTitle className="text-sm">No data</AlertTitle>
          <AlertDescription className="pt-4">
            <p className="mb-2">
              This tournament looks imported, but we have no data. It is probably not available on
              melee.gg.
            </p>
            <p>
              If you think that is an error and you see data available in melee, pinging{' '}
              <b>@Medo</b> on
              <a
                href={DISCORD_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join our Discord"
                className="px-2 underline"
              >
                Discord
              </a>
              with additional data is the fastest way to get it done!
            </p>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  // For future tournaments
  if (isUpcoming) {
    return (
      <Alert variant="info">
        <AlertCircle className="h-4 w-4 text-blue-500 stroke-blue-500" />
        <AlertTitle className="text-sm">Upcoming tournament</AlertTitle>
        <AlertDescription className="pt-4 flex items-center">
          <UpcomingBadge date={tournament.date} showTooltip={true} />
        </AlertDescription>
      </Alert>
    );
  }

  // For past/current tournaments that are not imported
  return (
    <Alert variant="warning">
      <AlertCircle className="h-4 w-4 text-yellow-600 stroke-yellow-600 dark:text-yellow-400 dark:stroke-yellow-400" />
      <AlertTitle className="text-sm">Not imported yet</AlertTitle>
      <AlertDescription className="pt-4">
        <p className="mb-2">Data for this tournament is not imported yet.</p>
        <p>
          If the data is already available on melee, pinging <b>@Medo</b> on
          <a
            href={DISCORD_LINK}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join our Discord"
            className="px-2 underline"
          >
            Discord
          </a>
          with a link is the fastest way to get it done.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default NoTournamentData;
