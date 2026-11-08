import { useId, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';
import { useWatchedPlayerRounds } from '@/api/tournament-weekends/useWatchedPlayerRounds.ts';
import type {
  LiveTournamentHomeWatchedMatch,
  LiveTournamentHomeWatchedTournament,
} from '../../../../../../../types/TournamentWeekend.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getRoundName } from '../liveTournamentUtils.ts';
import { formatPlacement, getWatchedResultLabel } from './watchedPlayerPresentation.ts';

export type WatchedTournamentPlayer = LiveTournamentHomeWatchedTournament & { displayName: string };

function MatchResult({
  match,
  finished,
}: {
  match: LiveTournamentHomeWatchedMatch;
  finished: boolean;
}) {
  const hasScore =
    match.outcome &&
    match.outcome !== 'bye' &&
    match.playerGameWins !== null &&
    match.opponentGameWins !== null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium tabular-nums',
        (match.outcome === 'win' || match.outcome === 'bye') &&
          'text-emerald-700 dark:text-emerald-300',
        match.outcome === 'loss' && 'text-rose-700 dark:text-rose-300',
        match.outcome === 'draw' && 'text-amber-700 dark:text-amber-300',
        !match.outcome && 'text-muted-foreground',
      )}
    >
      <span>{getWatchedResultLabel(match, finished)}</span>
      {hasScore && (
        <span>
          {match.playerGameWins}–{match.opponentGameWins}
        </span>
      )}
    </span>
  );
}

export function WatchedPlayerRow({
  player,
  tournament,
  finished,
}: {
  player: WatchedTournamentPlayer;
  tournament: LiveTournamentWeekendTournamentEntry;
  finished: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const finalStanding = finished ? player.finalStanding : null;
  const placement = finalStanding?.placement;
  const champion = placement === 1;
  const standingRound = getRoundName(tournament, player.standing?.roundNumber);
  const latestRound = getRoundName(tournament, player.latestMatch?.roundNumber);
  const record = finalStanding?.matchRecord ?? player.standing?.matchRecord;

  return (
    <>
      <TableRow
        className={cn('cursor-pointer', open && 'bg-muted/40', champion && 'bg-[var(--live-tint)]')}
        onClick={() => setOpen(value => !value)}
      >
        <TableCell className="py-1 pl-2 pr-1">
          <button
            type="button"
            className="flex min-h-8 w-full items-center gap-1.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            title={player.displayName}
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={`${open ? 'Hide' : 'Show'} rounds for ${player.displayName}`}
            onClick={event => {
              event.stopPropagation();
              setOpen(value => !value);
            }}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3.5 shrink-0 transition-transform motion-reduce:transition-none',
                open && 'rotate-180',
              )}
            />
            <span className="truncate text-[11px] font-semibold leading-4">
              {player.displayName}
            </span>
          </button>
        </TableCell>
        <TableCell
          className="px-1 py-1 text-right text-[11px] tabular-nums"
          title={!finalStanding && standingRound ? `Rank from ${standingRound}` : undefined}
        >
          {placement != null && placement > 0 ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold',
                placement <= 3 && 'text-[var(--live-gold)]',
              )}
            >
              {champion && <Trophy className="size-3" role="img" aria-label="Champion" />}
              {formatPlacement(placement)}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {finalStanding ? 'Pending' : player.standing ? `#${player.standing.rank}` : '—'}
            </span>
          )}
        </TableCell>
        <TableCell
          className="px-1 py-1 text-right last:pr-3"
          title={
            finalStanding
              ? 'Final match record'
              : `Standings snapshot: ${standingRound ?? 'unavailable'}`
          }
        >
          <span className="whitespace-nowrap text-[11px] font-medium tabular-nums">
            {record ?? '—'}
          </span>
        </TableCell>
        {!finished && (
          <TableCell className="py-1 pl-2 pr-2 text-right">
            {player.latestMatch ? (
              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                <span
                  className="truncate text-[10px] text-muted-foreground"
                  title={latestRound ?? undefined}
                >
                  {latestRound}
                </span>
                <MatchResult match={player.latestMatch} finished={finished} />
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">No pairing yet</span>
            )}
          </TableCell>
        )}
      </TableRow>
      <TableRow id={detailsId} hidden={!open} className="hover:bg-transparent">
        <TableCell colSpan={finished ? 3 : 4} className="p-0">
          {open && (
            <WatchedPlayerRounds
              displayName={player.displayName}
              tournament={tournament}
              finished={finished}
            />
          )}
        </TableCell>
      </TableRow>
    </>
  );
}

function WatchedPlayerRounds({
  displayName,
  tournament,
  finished,
}: {
  displayName: string;
  tournament: LiveTournamentWeekendTournamentEntry;
  finished: boolean;
}) {
  const rounds = useWatchedPlayerRounds(
    tournament.weekendTournament.tournamentWeekendId,
    tournament.tournament.id,
    displayName,
  );
  const matches = rounds.data?.data ?? [];
  return (
    <div className="border-t border-dashed border-[var(--live-line)] bg-muted/25 px-2 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-[10px]">
        <span className="font-semibold [overflow-wrap:anywhere]">
          {displayName} · Round history
        </span>
        <span className="text-muted-foreground">
          {rounds.data && (
            <>
              {matches.length} {matches.length === 1 ? 'round' : 'rounds'} available
            </>
          )}
        </span>
      </div>
      {rounds.isError && (
        <div role="alert" className="mb-2 flex items-center justify-between gap-2 text-[11px]">
          <span>{rounds.data ? 'Couldn’t refresh rounds.' : 'Couldn’t load rounds.'}</span>
          <Button variant="outline" size="sm" onClick={() => void rounds.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {rounds.isPending ? (
        <p role="status" className="m-0! text-[11px]! text-muted-foreground">
          Loading rounds…
        </p>
      ) : matches.length === 0 && !rounds.isError ? (
        <p className="m-0! text-[11px]! text-muted-foreground">
          Round details are not available yet.
        </p>
      ) : matches.length > 0 ? (
        <Table className="table-fixed text-[10px]" aria-label={`Round history for ${displayName}`}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="h-6 w-[27%] px-1 text-[10px]">
                Round
              </TableHead>
              <TableHead scope="col" className="h-6 px-1 text-[10px]">
                Opponent
              </TableHead>
              <TableHead scope="col" className="h-6 w-[29%] px-1 text-right text-[10px]">
                Result
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map(match => {
              const active =
                !finished &&
                tournament.weekendTournament.status === 'running' &&
                match.roundNumber === tournament.weekendTournament.roundNumber &&
                tournament.weekendTournament.matchesRemaining !== 0;
              return (
                <TableRow
                  key={`${match.roundNumber}-${match.matchKey}`}
                  className={cn('hover:bg-transparent', active && 'bg-[var(--live-tint)]')}
                >
                  <TableCell className="px-1 py-2 align-top text-[10px]">
                    {getRoundName(tournament, match.roundNumber)}
                    {active && (
                      <span className="mt-0.5 block text-[10px] font-medium text-[var(--live-accent)]">
                        Active round
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-2 align-top text-[10px] [overflow-wrap:anywhere]">
                    {match.outcome === 'bye'
                      ? 'No opponent'
                      : (match.opponentDisplayName ?? 'To be confirmed')}
                  </TableCell>
                  <TableCell className="px-1 py-2 text-right align-top">
                    <MatchResult match={match} finished={finished} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
