import { type FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  useDeletePlayerWatch,
  useGetPlayerWatch,
  useGetPlayers,
  usePostPlayerWatch,
} from '@/api/player-watch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';

const SEARCH_DEBOUNCE_DELAY = 500;

export function WatchedPlayersManager({ showDescription = false }: { showDescription?: boolean }) {
  const user = useUser();
  const inputId = useId();
  const [watchValue, setWatchValue] = useState('');
  const [debouncedWatchValue, setDebouncedWatchValue] = useState('');
  const watchlistQuery = useGetPlayerWatch(Boolean(user));
  const addWatch = usePostPlayerWatch();
  const removeWatch = useDeletePlayerWatch();
  const watchlist = watchlistQuery.data?.data ?? [];
  const normalizedWatchValue = watchValue.trim();
  const watchedPlayerDisplayNames = useMemo(
    () => new Set(watchlist.map(entry => entry.player.displayName)),
    [watchlist],
  );
  const isDebouncingSearch =
    normalizedWatchValue.length > 0 && normalizedWatchValue !== debouncedWatchValue;
  const playerSearchQuery = useGetPlayers(debouncedWatchValue, Boolean(user));
  const playerOptions = useMemo(
    () =>
      (playerSearchQuery.data?.data ?? []).map(player => ({
        ...player,
        isWatched: watchedPlayerDisplayNames.has(player.displayName),
      })),
    [playerSearchQuery.data?.data, watchedPlayerDisplayNames],
  );
  const mutationError = addWatch.error?.message ?? removeWatch.error?.message;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedWatchValue(normalizedWatchValue);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedWatchValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const displayName = normalizedWatchValue;
    if (!displayName) return;

    addWatch.mutate(
      { displayName },
      {
        onSuccess: () => setWatchValue(''),
      },
    );
  };

  const handlePlayerSelect = (displayName: string) => {
    addWatch.mutate(
      { displayName },
      {
        onSuccess: () => {
          setWatchValue('');
          setDebouncedWatchValue('');
        },
      },
    );
  };

  if (!user) {
    return (
      <div className="p-4 text-sm text-muted-foreground justify-center flex items-center">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showDescription && (
        <Alert variant="info">
          <AlertTitle>What this does</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Watched players are shown on the Live homepage in the Watched Players section whenever
              they appear in the currently active live tournament weekend.
            </p>
            <p>
              Use the player&apos;s exact Melee display name when adding them here. Matching is
              exact, so nicknames or partial names will not work.
            </p>
            <p>
              Some players may not be available yet. If a player is not found, it means they are not
              in our system yet and need to play their first PQ since this feature was added.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>Exact Melee display name</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="w-full sm:max-w-md">
              <Command className="rounded-md border" shouldFilter={false}>
                <CommandInput
                  id={inputId}
                  value={watchValue}
                  onValueChange={setWatchValue}
                  placeholder="Search or enter exact Melee display name"
                />
                {normalizedWatchValue.length > 0 && (
                  <CommandList className="border-t">
                    {isDebouncingSearch || playerSearchQuery.isFetching ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching players...
                      </div>
                    ) : playerSearchQuery.isError ? (
                      <div className="px-3 py-4 text-sm text-destructive">
                        {playerSearchQuery.error?.message ?? 'Failed to search players.'}
                      </div>
                    ) : playerOptions.length > 0 ? (
                      <CommandGroup heading="Matching players">
                        {playerOptions.map(player => (
                          <CommandItem
                            key={player.displayName}
                            value={player.displayName}
                            disabled={player.isWatched || addWatch.isPending}
                            onSelect={() => handlePlayerSelect(player.displayName)}
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="font-medium">{player.displayName}</span>
                            </div>
                            {player.isWatched && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                Already watched
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      <CommandEmpty>No matching players found.</CommandEmpty>
                    )}
                  </CommandList>
                )}
              </Command>
            </div>
            <Button
              type="submit"
              disabled={addWatch.isPending || normalizedWatchValue.length === 0}
              className="sm:self-start"
            >
              Add exact name
            </Button>
          </div>
        </div>
      </form>

      {mutationError && (
        <Alert variant="destructive">
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Melee display name</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlistQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading watched players...
                  </span>
                </TableCell>
              </TableRow>
            ) : watchlistQuery.isError ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-destructive">
                  {watchlistQuery.error?.message ?? 'Failed to load watched players.'}
                </TableCell>
              </TableRow>
            ) : watchlist.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No watched players yet.
                </TableCell>
              </TableRow>
            ) : (
              watchlist.map(entry => (
                <TableRow key={entry.player.displayName}>
                  <TableCell className="font-medium">{entry.player.displayName}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="iconSmall"
                      variant="ghost"
                      aria-label={`Remove ${entry.player.displayName}`}
                      onClick={() => removeWatch.mutate(entry.player.displayName)}
                      disabled={removeWatch.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
