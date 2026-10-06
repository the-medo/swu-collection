import { useState } from 'react';
import { Bookmark, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  useCreateTeamBookmark,
  useDeleteTeamBookmark,
  useTeamBookmarks,
  useUpdateTeamBookmark,
} from '@/api/teams';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { TeamBookmarkForm } from './TeamBookmarkForm.tsx';
import {
  MAX_TEAM_BOOKMARKS,
  type TeamBookmark,
  type ZTeamBookmarkRequest,
} from '../../../../../../types/ZTeamBookmark.ts';

export function TeamBookmarks({ teamId }: { teamId: string }) {
  const { data: bookmarks = [], isLoading, error, refetch } = useTeamBookmarks(teamId);
  const createBookmark = useCreateTeamBookmark(teamId);
  const updateBookmark = useUpdateTeamBookmark(teamId);
  const deleteBookmark = useDeleteTeamBookmark(teamId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamBookmark | null>(null);
  const pending = createBookmark.isPending || updateBookmark.isPending || deleteBookmark.isPending;

  async function save(value: ZTeamBookmarkRequest) {
    if (editing) {
      await updateBookmark.mutateAsync({ ...value, bookmarkId: editing.id });
      setEditing(null);
    } else {
      await createBookmark.mutateAsync(value);
    }
  }

  return (
    <div
      className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2"
      aria-label="Team bookmarks"
    >
      {isLoading && <Skeleton className="h-9 w-24" />}
      {!error &&
        bookmarks.map(bookmark => (
          <Button key={bookmark.id} asChild variant="outline" size="sm" className="max-w-full">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" title={bookmark.label}>
              <span className="max-w-40 truncate">{bookmark.label}</span>
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ))}
      <Dialog
        open={open}
        onOpenChange={value => {
          setOpen(value);
          if (!value) setEditing(null);
        }}
        header="Team bookmarks"
        headerDescription="Share useful links with your team. All team members can add, edit, and remove bookmarks."
        trigger={
          <Button variant="ghost" size="sm" aria-label="Manage team bookmarks">
            <Bookmark aria-hidden="true" />
            {error ? 'Retry bookmarks' : 'Bookmarks'}
          </Button>
        }
        contentClassName="w-[calc(100vw-2rem)] sm:w-[425px]"
      >
        <div className="flex flex-col gap-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading bookmarks...
            </p>
          ) : error ? (
            <div role="alert" className="space-y-2">
              <p className="text-sm text-destructive">Unable to load team bookmarks.</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : bookmarks.length ? (
            <ul className="space-y-2">
              {bookmarks.map(bookmark => (
                <li
                  key={bookmark.id}
                  className="flex min-w-0 items-center gap-2 rounded-md border p-2"
                >
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1"
                    title={bookmark.url}
                  >
                    <span className="block truncate text-sm font-medium">{bookmark.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {bookmark.url}
                    </span>
                  </a>
                  <Button
                    size="iconMedium"
                    variant="ghost"
                    disabled={pending}
                    aria-label={`Edit ${bookmark.label}`}
                    onClick={() => setEditing(bookmark)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="iconMedium"
                        variant="ghost"
                        disabled={pending}
                        aria-label={`Remove ${bookmark.label}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove bookmark?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove "{bookmark.label}" from this team's bookmarks?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={pending}
                          onClick={() =>
                            deleteBookmark.mutate(bookmark.id, {
                              onSuccess: () => {
                                if (editing?.id === bookmark.id) setEditing(null);
                              },
                            })
                          }
                        >
                          Remove bookmark
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No bookmarks yet. Add your team's first link below.
            </p>
          )}
          {!error && !isLoading && !editing && bookmarks.length >= MAX_TEAM_BOOKMARKS && (
            <p className="text-sm text-muted-foreground">
              Teams can have up to {MAX_TEAM_BOOKMARKS} bookmarks. Remove one to add another.
            </p>
          )}
          {!error && !isLoading && (editing || bookmarks.length < MAX_TEAM_BOOKMARKS) && (
            <TeamBookmarkForm
              key={editing?.id ?? 'new'}
              bookmark={editing ?? undefined}
              pending={pending}
              onSave={save}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
