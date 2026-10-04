import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, RefreshCw, Trophy } from 'lucide-react';
import { useUserTournaments } from '@/api/user/useUserTournaments.ts';
import { useRefreshUserTournaments } from '@/api/user/useRefreshUserTournaments.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';
import { getTournamentTypeLogo } from '@/lib/tournamentTypeLogo.ts';
import { UserTournamentTable } from './UserTournamentTable.tsx';
import type {
  UserMeleeTournament,
  UserMeleeTournamentStats,
} from '../../../../../../shared/types/UserMeleeTournaments.ts';

function Achievements({
  stats,
  tournaments,
}: {
  stats: UserMeleeTournamentStats;
  tournaments: UserMeleeTournament[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">PQ / Open top 8s</p>
        <p className="mt-3 text-4xl font-semibold tabular-nums">
          {stats.topEights}
          <span className="text-xl text-muted-foreground"> / {stats.pqOpenTotal}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Completed Planetary Qualifiers and Opens
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Major day 2 advancements</p>
        <p className="mt-3 text-4xl font-semibold tabular-nums">
          {stats.dayTwos}
          <span className="text-xl text-muted-foreground"> / {stats.majorTotal}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Completed majors lasting two or more days
        </p>
        {stats.unknownDayTwoCutoffs > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Day 2 cutoff unavailable for {stats.unknownDayTwoCutoffs}{' '}
            {stats.unknownDayTwoCutoffs === 1 ? 'event' : 'events'}.
          </p>
        )}
      </div>
      <div className="rounded-xl border bg-card p-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Trophy className="size-4" aria-hidden="true" />
          Best Major Finishes
        </p>
        {stats.bestMajorFinishes.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No completed major placements yet.</p>
        ) : (
          <ol aria-label="Best major tournament finishes" className="mt-3 divide-y divide-border">
            {stats.bestMajorFinishes.map(finish => {
              const tournament = tournaments.find(row => row.tournamentId === finish.tournamentId);
              const logo = getTournamentTypeLogo(tournament?.type);
              return (
                <li key={finish.tournamentId}>
                  <Link
                    to="/tournaments/$tournamentId"
                    params={{ tournamentId: finish.tournamentId }}
                    className="group flex items-center gap-3 rounded-md py-2 text-amber-800 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-primary"
                    aria-label={`${finish.name}: #${finish.placement} of ${finish.attendance}`}
                  >
                    {logo ? (
                      <img
                        src={logo}
                        alt={tournament?.typeName ?? 'Major tournament'}
                        width={40}
                        height={40}
                        className="size-10 shrink-0 object-contain"
                        draggable={false}
                      />
                    ) : (
                      <Trophy
                        className="size-10 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex h-10 min-w-14 shrink-0 items-center justify-center rounded-md bg-muted px-2 text-lg font-semibold tabular-nums text-foreground">
                      #{finish.placement}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium group-hover:underline underline-offset-2">
                        {finish.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {finish.attendance} players
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export function UserTournamentsTab({ userId }: { userId: string }) {
  const owner = useUser()?.id === userId;
  const query = useUserTournaments(userId);
  const refresh = useRefreshUserTournaments(userId);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(Date.now);
  const nextRefreshAt = query.data?.nextRefreshAt ? Date.parse(query.data.nextRefreshAt) : 0;
  useEffect(() => {
    if (nextRefreshAt <= now) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextRefreshAt - Date.now()) + 50,
    );
    return () => window.clearTimeout(timer);
  }, [nextRefreshAt, now]);
  const coolingDown = nextRefreshAt > now;

  if (query.isPending) return <p role="status">Loading tournaments…</p>;
  if (query.isError)
    return (
      <div role="alert" className="space-y-3">
        <p>{query.error.message}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const { tournaments, stats, lastRefreshedAt, connected } = query.data;
  const filtered = tournaments.filter(row =>
    `${row.name} ${row.typeName ?? ''} ${row.format ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="min-w-0 space-y-4">
      {!connected ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          {owner
            ? 'Connect your Melee account in Settings → Integrations to add your tournament results.'
            : 'This player has not connected a Melee account.'}
        </p>
      ) : (
        <>
          <Achievements stats={stats} tournaments={tournaments} />
          {owner && (
            <p className="text-xs text-muted-foreground">
              Refreshed results appear on your public profile.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-auto sm:min-w-48 sm:max-w-md sm:flex-1">
              <Input
                aria-label="Search tournaments"
                placeholder="Search tournaments, types or formats…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:ml-auto">
              {lastRefreshedAt
                ? `Last refreshed ${new Date(lastRefreshedAt).toLocaleString()}`
                : 'No results refreshed yet.'}
            </p>
            {owner && (
              <Button
                variant="outline"
                disabled={refresh.isPending || coolingDown}
                onClick={() => refresh.mutate()}
              >
                <RefreshCw
                  className={cn('mr-2 size-4', refresh.isPending && 'animate-spin')}
                  aria-hidden="true"
                />
                {refresh.isPending
                  ? 'Refreshing…'
                  : coolingDown
                    ? 'Refresh available shortly'
                    : 'Refresh from Melee'}
              </Button>
            )}
          </div>
          {refresh.isError && (
            <p role="alert" className="text-sm text-destructive">
              {refresh.error.message}
            </p>
          )}
          {refresh.isSuccess && (
            <p role="status" className="text-sm text-muted-foreground">
              Tournament results updated.
            </p>
          )}
          {tournaments.length === 0 ? (
            <p className="rounded-lg border p-6 text-sm text-muted-foreground">
              {lastRefreshedAt
                ? 'No results found for tournaments set up in SWUBASE.'
                : owner
                  ? 'Refresh from Melee to load your tournament history.'
                  : 'This player has not refreshed their tournament history yet.'}
            </p>
          ) : (
            <UserTournamentTable key={search} tournaments={filtered} />
          )}
        </>
      )}
    </div>
  );
}
