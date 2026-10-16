import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarDays, Check, Globe2, Link2, Unlink } from 'lucide-react';
import { useAlbumTournamentOptions } from '@/api/user-albums/useAlbumTournamentOptions.ts';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { albumPanel, albumTheme } from './albumStyles.ts';
import type { AlbumTournament, UserAlbum } from '../../../../../types/UserAlbum.ts';

export function AlbumTournamentControl({
  album,
  disabled,
  onBusy,
}: {
  album: UserAlbum;
  disabled: boolean;
  onBusy(busy: boolean): void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<AlbumTournament | null>(null);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const mutation = useAlbumMutation();
  const query = useAlbumTournamentOptions(debouncedSearch, open && !confirmPublic);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const searchId = useId();
  const locked = disabled || mutation.isPending || album.eventLinkBlocked;
  const searching = search !== debouncedSearch || query.isFetching;
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);
  useEffect(() => {
    if (confirmPublic) cancel.current?.focus();
  }, [confirmPublic]);
  useEffect(() => {
    onBusy(mutation.isPending);
    return () => onBusy(false);
  }, [mutation.isPending, onBusy]);
  const link = (publish: boolean) => {
    if (!selected || locked) return;
    if (album.visibility !== 'public' && !publish) {
      setConfirmPublic(true);
      return;
    }
    mutation.mutate(
      {
        action: 'update',
        id: album.id,
        input: {
          revision: album.revision,
          tournamentId: selected.id,
          ...(publish ? { visibility: 'public' as const } : {}),
        },
      },
      { onSuccess: () => setOpen(false) },
    );
  };
  return (
    <section
      className={`${albumPanel} flex flex-wrap items-center gap-4 p-5 sm:p-6`}
      aria-label="Album event"
    >
      <CalendarDays className="size-6 shrink-0 text-[var(--album-accent)]" />
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="m-0! p-0! text-base! font-semibold!">Event</h3>
        {album.tournament ? (
          <>
            <Link
              className="mt-1 block break-words text-sm font-medium underline underline-offset-4"
              to="/tournaments/$tournamentId/details"
              params={{ tournamentId: album.tournament.id }}
            >
              {album.tournament.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              This album’s photos appear on the tournament page.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {album.eventLinkBlocked
              ? 'An admin has disabled event linking for this album. Only an admin can restore it. You can still manage your album and photos.'
              : 'Link a tournament to share your photos with everyone who attended.'}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={trigger}
          variant="outline"
          className="rounded-xl"
          disabled={locked}
          onClick={() => {
            mutation.reset();
            setSelected(null);
            setSearch('');
            setDebouncedSearch('');
            setConfirmPublic(false);
            setOpen(true);
          }}
        >
          <Link2 />
          {album.tournament ? 'Change tournament' : 'Link tournament'}
        </Button>
        {album.tournament && (
          <Button
            variant="ghost"
            disabled={locked}
            onClick={() =>
              mutation.mutate({
                action: 'update',
                id: album.id,
                input: { revision: album.revision, tournamentId: null },
              })
            }
          >
            <Unlink />
            Unlink
          </Button>
        )}
      </div>
      {!open && mutation.isError && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!mutation.isPending) setOpen(next);
        }}
      >
        <DialogContent
          className={`${albumTheme} max-h-[90dvh] overflow-y-auto sm:max-w-xl`}
          onCloseAutoFocus={event => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {confirmPublic ? 'Make this album public?' : 'Link a tournament'}
            </DialogTitle>
            <DialogDescription>
              {confirmPublic
                ? `To link “${selected?.name}”, this album must be public. All its photos, including future uploads, will be visible to everyone on your profile and the tournament page.`
                : 'Choose the event these photos are from. Only public albums can appear on a tournament page.'}
            </DialogDescription>
          </DialogHeader>
          {!confirmPublic && (
            <>
              <div className="space-y-2">
                <label htmlFor={searchId} className="text-sm font-medium">
                  Search tournaments
                </label>
                <Input
                  id={searchId}
                  value={search}
                  maxLength={200}
                  disabled={locked}
                  placeholder="Name, country code, or tournament URL"
                  onChange={event => {
                    setSearch(event.target.value);
                    setSelected(null);
                  }}
                />
              </div>
              <div
                className="max-h-72 space-y-2 overflow-y-auto"
                role="group"
                aria-label="Tournament results"
                aria-busy={searching}
              >
                {query.isPending && (
                  <p role="status" className="py-4 text-sm text-muted-foreground">
                    Loading tournaments…
                  </p>
                )}
                {query.data?.pages
                  .flatMap(page => page.tournaments)
                  .map(event => (
                    <button
                      key={event.id}
                      type="button"
                      aria-pressed={selected?.id === event.id}
                      disabled={locked || searching}
                      onClick={() => setSelected(event)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted aria-pressed:border-[var(--album-accent)] aria-pressed:bg-muted disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-medium">{event.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {event.date} · {event.location}
                        </span>
                      </span>
                      {selected?.id === event.id && <Check className="size-4 shrink-0" />}
                    </button>
                  ))}
                {query.isSuccess && !query.data.pages[0].tournaments.length && (
                  <p className="py-4 text-sm text-muted-foreground">
                    No tournaments found. Try another name or country code.
                  </p>
                )}
                {query.isError && (
                  <div role="alert">
                    <p className="text-sm text-destructive">{query.error.message}</p>
                    <Button variant="outline" onClick={() => void query.refetch()}>
                      Try again
                    </Button>
                  </div>
                )}
                {query.hasNextPage && (
                  <Button
                    variant="outline"
                    disabled={searching}
                    onClick={() => void query.fetchNextPage()}
                  >
                    Load more tournaments
                  </Button>
                )}
              </div>
              {selected && (
                <p className="text-sm">
                  Selected: <strong>{selected.name}</strong>
                </p>
              )}
            </>
          )}
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              ref={cancel}
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              key={confirmPublic ? 'publish' : 'link'}
              disabled={!selected || locked}
              onClick={event => {
                // A second click in the opening gesture must not confirm publication.
                if (confirmPublic && event.detail > 1) return;
                link(confirmPublic);
              }}
            >
              {confirmPublic ? <Globe2 /> : <Link2 />}
              {mutation.isPending
                ? 'Linking…'
                : confirmPublic
                  ? 'Make public and link'
                  : 'Link tournament'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
