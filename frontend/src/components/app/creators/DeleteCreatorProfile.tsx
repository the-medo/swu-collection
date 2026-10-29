import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog.tsx';
import { useDeleteCreatorProfile, useCreatorDeletionPreview } from '@/api/creators';
import { Status } from './CreatorControls.tsx';
import type { CreatorProfile } from '../../../../../shared/creators/contracts.ts';

export function DeleteCreatorProfile({
  profile,
  disabled,
  onDeleted,
}: {
  profile: CreatorProfile;
  disabled: boolean;
  onDeleted: (alreadyMissing: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-3 rounded-xl border border-destructive/30 bg-card p-5">
      <h2 className="font-semibold">Delete creator profile</h2>
      <p className="text-sm text-muted-foreground">
        Remove this creator profile from SWUBASE. Your account and saved decks stay. You can keep
        articles you authored in your personal library.
      </p>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            className="justify-self-start"
            disabled={disabled}
          >
            Delete creator profile
          </Button>
        </AlertDialogTrigger>
        {open && <DeletionConfirmation profile={profile} onDeleted={onDeleted} />}
      </AlertDialog>
    </section>
  );
}

function DeletionConfirmation({
  profile,
  onDeleted,
}: {
  profile: CreatorProfile;
  onDeleted: (alreadyMissing: boolean) => void;
}) {
  const preview = useCreatorDeletionPreview(profile.id);
  const mutation = useDeleteCreatorProfile(onDeleted);
  const [confirmation, setConfirmation] = useState('');
  const [keepMyArticles, setKeepMyArticles] = useState(true);
  const summary = preview.data;
  const kept = keepMyArticles ? (summary?.keepableArticles ?? 0) : 0;
  const deleted = (summary?.total ?? 0) - kept;
  const deletedDrafts =
    (summary?.drafts ?? 0) - (keepMyArticles ? (summary?.keepableDrafts ?? 0) : 0);
  const busy = mutation.isPending;
  const missing =
    (preview.error as (Error & { status?: number }) | null)?.status === 404 ||
    (mutation.error as (Error & { status?: number }) | null)?.status === 404;
  return (
    <AlertDialogContent
      onEscapeKeyDown={event => {
        if (busy) event.preventDefault();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="break-words">
          Delete {summary?.name ?? profile.name}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          This permanently removes the creator profile. Your SWUBASE account, personal library,
          saved decks, and videos on YouTube stay.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {!missing && <Status loading={preview.isPending} error={preview.error ?? mutation.error} />}
      {missing && (
        <p role="status">This creator profile no longer exists. Return to your personal library.</p>
      )}
      {preview.isError && !missing && (
        <Button type="button" variant="outline" onClick={() => void preview.refetch()}>
          Retry summary
        </Button>
      )}
      {summary && !missing && (
        <>
          {summary.keepableArticles > 0 ? (
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <Checkbox
                checked={keepMyArticles}
                disabled={busy || !summary.keepableArticles}
                onCheckedChange={value => setKeepMyArticles(value === true)}
              />
              <span>
                Keep my {summary.keepableArticles}{' '}
                {summary.keepableArticles === 1 ? 'article' : 'articles'} in Personal
                <span className="mt-1 block text-xs text-muted-foreground">
                  Includes articles you previously moved into this profile. Published links and
                  dates stay; drafts stay private. Articles by other editors and non-article content
                  cannot be kept here.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              There are no articles you authored that can be moved to Personal.
            </p>
          )}
          <div aria-live="polite" className="space-y-2 text-sm">
            <p>
              <strong>
                {deleted} {deleted === 1 ? 'publication' : 'publications'} will be permanently
                deleted
              </strong>
              , including {deletedDrafts} {deletedDrafts === 1 ? 'draft' : 'drafts'}. Their links
              will stop working.
            </p>
            <p>
              {summary.channels} channel {summary.channels === 1 ? 'connection' : 'connections'} and{' '}
              {summary.editors} {summary.editors === 1 ? 'editor' : 'editors'} will be removed.
              Automatic imports and followers for this profile will be removed.
            </p>
          </div>
          <label className="grid gap-2 text-sm">
            <span>
              Type <strong className="break-all">{summary.slug}</strong> to confirm
            </span>
            <Input
              aria-label="Creator profile address"
              autoComplete="off"
              spellCheck={false}
              value={confirmation}
              disabled={busy}
              onChange={event => setConfirmation(event.target.value)}
            />
          </label>
        </>
      )}
      <AlertDialogFooter>
        {missing ? (
          <Button type="button" autoFocus onClick={() => void mutation.finish(true)}>
            Return to studio
          </Button>
        ) : (
          <>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={
                busy ||
                preview.isFetching ||
                preview.isError ||
                !summary ||
                confirmation !== summary.slug
              }
              onClick={() => {
                if (!summary) return;
                void mutation
                  .mutateAsync({
                    id: profile.id,
                    confirmation,
                    keepMyArticles,
                    snapshot: summary.snapshot,
                  })
                  .catch((error: Error & { status?: number }) => {
                    if (error.status === 409) {
                      setConfirmation('');
                      void preview.refetch();
                    }
                  });
              }}
            >
              {busy ? 'Deleting profile…' : 'Delete profile permanently'}
            </Button>
          </>
        )}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
