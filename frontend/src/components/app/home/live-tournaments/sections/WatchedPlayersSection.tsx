import { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { WatchedPlayersManager } from '@/components/app/player-watch/WatchedPlayersManager.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { cn } from '@/lib/utils.ts';
import { LiveSectionHeader } from '../components';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { WatchedTournamentTable } from './WatchedTournamentTable.tsx';

export function WatchedPlayersSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const user = useUser();
  const watchedTournamentGroups = useMemo(
    () =>
      detail.tournaments.flatMap(tournament => {
        const players = detail.watchedPlayers
          .flatMap(entry => {
            const watchedTournament = entry.tournaments.find(
              watchedEntry => watchedEntry.tournamentId === tournament.tournament.id,
            );
            const standing = watchedTournament?.standing ?? null;
            const latestMatch = watchedTournament?.latestMatch ?? null;

            if (
              !watchedTournament ||
              (standing === null && latestMatch === null && !watchedTournament.finalStanding)
            )
              return [];

            return [
              {
                ...watchedTournament,
                displayName: entry.displayName,
              },
            ];
          })
          .sort((left, right) => {
            const leftPlacement =
              (left.finalStanding?.placement ?? 0) > 0
                ? (left.finalStanding?.placement ?? Infinity)
                : Infinity;
            const rightPlacement =
              (right.finalStanding?.placement ?? 0) > 0
                ? (right.finalStanding?.placement ?? Infinity)
                : Infinity;
            if (leftPlacement !== rightPlacement) return leftPlacement - rightPlacement;
            if (left.standing && right.standing) {
              return (
                right.standing.roundNumber - left.standing.roundNumber ||
                left.standing.rank - right.standing.rank
              );
            }

            if (left.standing) return -1;
            if (right.standing) return 1;

            const leftLatestRound = left.latestMatch?.roundNumber ?? -1;
            const rightLatestRound = right.latestMatch?.roundNumber ?? -1;

            if (leftLatestRound !== rightLatestRound) {
              return rightLatestRound - leftLatestRound;
            }

            return left.displayName.localeCompare(right.displayName);
          });

        if (players.length === 0) return [];

        return [
          {
            tournament,
            players,
          },
        ];
      }),
    [detail.tournaments, detail.watchedPlayers],
  );

  return (
    <Dialog>
      <section className="flex w-full flex-col gap-3">
        <LiveSectionHeader
          title="Your watchlist"
          detail="Standings, pairings, and results for your players."
          action={
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                aria-label="Manage watched players"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          }
        />

        {!user ? (
          <div
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
            Sign in to follow players.
          </div>
        ) : detail.watchlist.length === 0 ? (
          <div
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
            Add players to your watchlist to follow their standings and latest matches here.
          </div>
        ) : watchedTournamentGroups.length === 0 ? (
          <div
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
            None of your watched players are active in the current live tournament weekend.
          </div>
        ) : (
          <div className="grid gap-3">
            {watchedTournamentGroups.map(group => (
              <WatchedTournamentTable
                key={group.tournament.tournament.id}
                tournament={group.tournament}
                players={group.players}
              />
            ))}
          </div>
        )}
      </section>

      <DialogContent className={cn('max-h-[85vh] overflow-y-auto', 'sm:max-w-3xl')}>
        <DialogHeader>
          <DialogTitle>Watched Players</DialogTitle>
        </DialogHeader>
        <WatchedPlayersManager />
      </DialogContent>
    </Dialog>
  );
}
