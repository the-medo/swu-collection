import { ActivityRow } from './ActivityRow.tsx';
import { useRequestPractice } from '@/api/crossfire/usePractice.ts';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bookmark as BookmarkIcon, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useBookmarks, useEditBookmark } from '@/api/crossfire/useBookmarks.ts';
import type { CrossfireBookmark } from '../../../../../shared/types/crossfire-activity.ts';
function BookmarkRow({ bookmark, sessionId }: { bookmark: CrossfireBookmark; sessionId: string }) {
  const practice = useRequestPractice(sessionId);
  const edit = useEditBookmark(sessionId),
    [editing, setEditing] = useState(false),
    [label, setLabel] = useState(bookmark.label);
  return (
    <ActivityRow leaders={bookmark.leaders} bases={bookmark.bases}>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              edit.mutate({ id: bookmark.id, label }, { onSuccess: () => setEditing(false) });
            }}
          >
            <Input
              aria-label="Bookmark label"
              maxLength={120}
              value={label}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />
            <Button size="sm" type="submit" disabled={edit.isPending}>
              Save label
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <p className="break-words font-medium">{bookmark.label || 'Saved position'}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {new Date(bookmark.createdAt).toLocaleString()}
          {!bookmark.available && ' · Access unavailable'}
        </p>
        {edit.isError && <p role="alert">Could not update this bookmark.</p>}
      </div>
      <div className="flex items-center gap-2">
        {bookmark.canPractice && (
          <Button
            size="sm"
            variant="outline"
            disabled={practice.isPending || practice.isSuccess}
            onClick={() => practice.mutate(bookmark.id)}
          >
            {practice.isSuccess ? 'Invitation sent' : 'Play from here'}
          </Button>
        )}
        {practice.isError && (
          <p role="alert" className="text-sm">
            Could not invite your opponent. Check that the source game is finalized.
          </p>
        )}
        {bookmark.available && (
          <Button asChild size="sm" variant="secondary">
            <Link
              to="/crossfire/replay/$lobbyId"
              params={{ lobbyId: bookmark.lobbyId }}
              search={{ cfPosition: bookmark.position, cfBranch: bookmark.branch }}
            >
              View from here
            </Link>
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          aria-label="Rename bookmark"
          onClick={() => setEditing(!editing)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete bookmark"
          disabled={edit.isPending}
          onClick={() => edit.mutate({ id: bookmark.id })}
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </ActivityRow>
  );
}
export function Bookmarks({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  embedded?: boolean;
}) {
  const query = useBookmarks(sessionId);
  return (
    <section
      className={
        embedded ? 'cf-activity-panel space-y-4' : 'space-y-4 rounded-xl border bg-card p-5 sm:p-6'
      }
      aria-labelledby="cf-bookmarks-title"
    >
      <h2
        id="cf-bookmarks-title"
        className={embedded ? 'sr-only' : 'flex items-center gap-2 text-xl font-semibold'}
      >
        <BookmarkIcon size={20} /> Your bookmarks
      </h2>
      <p className="text-sm text-muted-foreground">
        Play from here creates a practice game. You can replay it in Crossfire, but it does not
        appear in your personal or team statistics.
      </p>
      {query.isPending ? (
        <p>Loading bookmarks…</p>
      ) : query.isError ? (
        <div role="alert">
          Could not load bookmarks.{' '}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!query.data.length && (
            <p className="text-sm text-muted-foreground">
              Save positions from the board or a replay to revisit them here.
            </p>
          )}
          <div className="cf-game-list">
            {query.data.map(bookmark => (
              <BookmarkRow key={bookmark.id} bookmark={bookmark} sessionId={sessionId} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
