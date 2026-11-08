import { CircleCheck, Radio, Trophy } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { formatDateTime, getMatchesRemainingLabel } from '../liveTournamentUtils.ts';
import { WatchedPlayerRow, type WatchedTournamentPlayer } from './WatchedPlayerRow.tsx';
import { getWatchTournamentStatus } from './watchedPlayerPresentation.ts';

export function WatchedTournamentTable({
  tournament,
  players,
}: {
  tournament: LiveTournamentWeekendTournamentEntry;
  players: WatchedTournamentPlayer[];
}) {
  const finished =
    tournament.weekendTournament.status === 'finished' || tournament.tournament.imported;
  const completeRound = tournament.weekendTournament.matchesRemaining === 0;
  const StatusIcon = finished ? Trophy : completeRound ? CircleCheck : Radio;
  const updated = formatDateTime(tournament.weekendTournament.lastUpdatedAt);
  const progress = getMatchesRemainingLabel(tournament);
  const finalResultsAvailable = players.every(
    player => player.finalStanding?.placement != null && player.finalStanding.placement > 0,
  );

  const hasFinalResults = players.some(
    player => player.finalStanding?.placement != null && player.finalStanding.placement > 0,
  );

  return (
    <section
      className="live-watched-group @container/watchlist min-w-0 overflow-hidden rounded-xl border border-border"
      aria-label={`Watched players at ${tournament.tournament.name}`}
    >
      <header className="border-b border-border bg-muted/30 px-3 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <Flag
            countryCode={tournament.tournament.location as CountryCode}
            className="mt-0.5 h-3.5 w-4.5 shrink-0 rounded-sm"
          />
          <h4 className="m-0! text-[12px]! font-semibold! leading-4! [overflow-wrap:anywhere]">
            {tournament.tournament.name}
          </h4>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-medium',
              finished ? 'text-[var(--live-gold)]' : 'text-[var(--live-accent)]',
            )}
          >
            <StatusIcon className="size-3 shrink-0" aria-hidden="true" />
            <span>{getWatchTournamentStatus(tournament)}</span>
          </span>
          {!finished && progress && tournament.weekendTournament.status === 'running' && (
            <span className="text-muted-foreground">{progress}</span>
          )}
          {finished && (
            <span className="text-muted-foreground">
              {finalResultsAvailable
                ? 'Final standings'
                : hasFinalResults
                  ? 'Final standings · some placements pending'
                  : 'Final placements pending · latest standings shown'}
            </span>
          )}
        </div>
      </header>
      <div className="overflow-x-auto">
        <Table
          className="table-fixed"
          aria-label={`${finished && finalResultsAvailable ? 'Final standings' : 'Latest standings'} for watched players at ${tournament.tournament.name}`}
        >
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0">
              <TableHead scope="col" className="h-0 p-0">
                <span className="sr-only">Player</span>
              </TableHead>
              <TableHead
                scope="col"
                className={cn('h-0 p-0', finished ? 'w-14' : 'w-12 @max-[360px]/watchlist:w-10')}
              >
                <span className="sr-only">{finished ? 'Finish' : 'Rank'}</span>
              </TableHead>
              <TableHead
                scope="col"
                className={cn('h-0 w-14 p-0', !finished && '@max-[360px]/watchlist:w-12')}
              >
                <span className="sr-only">Match record: wins, losses, draws</span>
              </TableHead>
              {!finished && (
                <TableHead scope="col" className="h-0 w-32 p-0 @max-[360px]/watchlist:w-27">
                  <span className="sr-only">Latest round and result</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map(player => (
              <WatchedPlayerRow
                key={player.displayName}
                player={player}
                tournament={tournament}
                finished={finished}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {updated && (
        <footer className="border-t border-border bg-muted/15 px-3 py-2 text-[10px] text-muted-foreground">
          <span title="Tournament data last checked">Updated {updated}</span>
        </footer>
      )}
    </section>
  );
}
