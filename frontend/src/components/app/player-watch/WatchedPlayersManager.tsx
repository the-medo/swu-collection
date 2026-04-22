import { type FormEvent, useId, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useDeletePlayerWatch, useGetPlayerWatch, usePostPlayerWatch } from '@/api/player-watch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
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

export function WatchedPlayersManager() {
  const user = useUser();
  const inputId = useId();
  const [watchValue, setWatchValue] = useState('');
  const watchlistQuery = useGetPlayerWatch(Boolean(user));
  const addWatch = usePostPlayerWatch();
  const removeWatch = useDeletePlayerWatch();
  const watchlist = watchlistQuery.data?.data ?? [];
  const mutationError = addWatch.error?.message ?? removeWatch.error?.message;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const displayName = watchValue.trim();
    if (!displayName) return;

    addWatch.mutate(
      { displayName },
      {
        onSuccess: () => setWatchValue(''),
      },
    );
  };

  if (!user) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Sign in to manage watched players.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <AlertTitle>What this does</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Watched players are shown on the Live homepage in the Watched Players section whenever
            they appear in the currently active live tournament weekend.
          </p>
          <p>
            Use the player&apos;s exact Melee display name when adding them here. Matching is exact,
            so nicknames or partial names will not work.
          </p>
          <p>
            Some players may not be available yet. If a player is not found, it means they are not
            in our system yet and need to play their first PQ since this feature was added.
          </p>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>Exact Melee display name</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              id={inputId}
              value={watchValue}
              onChange={event => setWatchValue(event.target.value)}
              placeholder="Exact Melee display name"
              className="sm:max-w-md"
            />
            <Button
              type="submit"
              disabled={addWatch.isPending || watchValue.trim().length === 0}
              className="sm:self-end"
            >
              Add player
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
              <TableHead className="w-32">Melee ID</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlistQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading watched players...
                  </span>
                </TableCell>
              </TableRow>
            ) : watchlistQuery.isError ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-destructive">
                  {watchlistQuery.error?.message ?? 'Failed to load watched players.'}
                </TableCell>
              </TableRow>
            ) : watchlist.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No watched players yet.
                </TableCell>
              </TableRow>
            ) : (
              watchlist.map(entry => (
                <TableRow key={entry.player.id}>
                  <TableCell className="font-medium">{entry.player.displayName}</TableCell>
                  <TableCell>{entry.player.id}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="iconSmall"
                      variant="ghost"
                      aria-label={`Remove ${entry.player.displayName}`}
                      onClick={() => removeWatch.mutate(entry.player.id)}
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
