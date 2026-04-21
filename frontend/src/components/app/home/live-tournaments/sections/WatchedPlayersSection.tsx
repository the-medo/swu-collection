import { Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { LiveSectionHeader } from '../components';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';

export function WatchedPlayersSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const user = useUser();
  const activeWatchedPlayers = detail.watchedPlayers.filter(
    entry => entry.standings.length > 0 || entry.matches.length > 0,
  );

  return (
    <section className="flex w-full flex-col gap-3">
      <LiveSectionHeader title="Watched Players" count={activeWatchedPlayers.length} />

      {!user ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sign in to follow Melee players.
        </div>
      ) : detail.watchlist.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          You are not watching any players yet. Manage your watchlist in{' '}
          <Link
            to="/settings/"
            search={{ page: 'watched-players' }}
            className="font-medium underline underline-offset-2"
          >
            Settings
          </Link>
          .
        </div>
      ) : activeWatchedPlayers.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          None of your watched players are active in the current live tournament weekend.
        </div>
      ) : (
        <div className="grid gap-2">
          {activeWatchedPlayers.map(entry => (
            <div key={entry.player.id} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{entry.player.displayName}</div>
                  <div className="text-xs text-muted-foreground">Melee ID {entry.player.id}</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {entry.standings.slice(0, 3).map(row => (
                  <Badge
                    key={`${row.standing.tournamentId}-${row.standing.roundNumber}`}
                    variant="outline"
                    className="rounded-md"
                  >
                    Rank {row.standing.rank}, {row.standing.matchRecord}
                  </Badge>
                ))}
                {entry.matches.length > 0 && (
                  <Badge variant="outline" className="rounded-md">
                    {entry.matches.length} live matches
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {user && detail.watchlist.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your watchlist
          </div>
          <div className="flex flex-wrap gap-1.5">
            {detail.watchlist.map(entry => (
              <Badge key={entry.player.id} variant="outline" className="rounded-md">
                {entry.player.displayName}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
