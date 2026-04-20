import { type FormEvent, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useDeletePlayerWatch, usePostPlayerWatch } from '@/api/player-watch';
import { useUser } from '@/hooks/useUser.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { LiveSectionHeader } from '../components';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';

export function WatchedPlayersSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const user = useUser();
  const [watchValue, setWatchValue] = useState('');
  const addWatch = usePostPlayerWatch();
  const removeWatch = useDeletePlayerWatch();
  const activeWatchedPlayers = detail.watchedPlayers.filter(
    entry => entry.standings.length > 0 || entry.matches.length > 0,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = watchValue.trim();
    if (!value) return;

    const numericValue = Number.parseInt(value, 10);
    addWatch.mutate(
      Number.isFinite(numericValue) && numericValue.toString() === value
        ? { playerId: numericValue }
        : { displayName: value },
      {
        onSuccess: () => setWatchValue(''),
      },
    );
  };

  return (
    <section className="flex w-full flex-col gap-3">
      <LiveSectionHeader title="Watched Players" count={activeWatchedPlayers.length} />

      {!user ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sign in to follow Melee players.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Input
            value={watchValue}
            onChange={event => setWatchValue(event.target.value)}
            placeholder="Melee id or exact name"
            className="h-8 text-xs"
          />
          <Button size="xs" type="submit" disabled={addWatch.isPending} className="self-start">
            Add
          </Button>
        </form>
      )}

      {addWatch.isError && (
        <p className="text-xs text-destructive">
          {addWatch.error?.message ?? 'Player could not be added'}
        </p>
      )}

      {activeWatchedPlayers.length > 0 && (
        <div className="grid gap-2">
          {activeWatchedPlayers.map(entry => (
            <div key={entry.player.id} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{entry.player.displayName}</div>
                  <div className="text-xs text-muted-foreground">Melee ID {entry.player.id}</div>
                </div>
                <Button
                  size="iconSmall"
                  variant="ghost"
                  onClick={() => removeWatch.mutate(entry.player.id)}
                  disabled={removeWatch.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
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
        <div className="flex flex-wrap gap-1.5">
          {detail.watchlist.map(entry => (
            <Badge key={entry.player.id} variant="outline" className="gap-1 rounded-md">
              {entry.player.displayName}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => removeWatch.mutate(entry.player.id)}
              >
                x
              </button>
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
