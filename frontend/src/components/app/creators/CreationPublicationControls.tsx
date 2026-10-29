import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { creatorHeading } from './creatorStyles.ts';
import type { useCreationDraft } from './useCreationDraft.ts';
type Draft = ReturnType<typeof useCreationDraft>;
type Toggle = Dispatch<SetStateAction<boolean>>;
export function CreationPublicationControls({
  draft,
  editing,
  preview,
  setPreview,
}: {
  draft: Draft;
  editing: boolean;
  preview: boolean;
  setPreview: Toggle;
}) {
  const {
    busy,
    error,
    dirty,
    id,
    published,
    hasUnpublishedChanges,
    save,
    publish,
    publishing,
    close,
  } = draft;
  const [copyStatus, setCopyStatus] = useState('');
  const [copySource, setCopySource] = useState({ id, published });
  if (copySource.id !== id || copySource.published !== published) {
    setCopySource({ id, published });
    setCopyStatus('');
  }
  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => setCopyStatus(''), 4000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/content/${id}`);
      setCopyStatus('Link copied');
    } catch {
      setCopyStatus('Could not copy the link. Open the publication to copy its address.');
    }
  };
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card/95 p-4 backdrop-blur">
      <div>
        <h2 className={creatorHeading}>
          {editing ? 'Edit' : 'New'} {draft.document.medium === 'article' ? 'article' : 'creation'}
        </h2>
        <p
          role="status"
          className="mt-1! mb-0! text-[11px]! leading-relaxed! text-muted-foreground"
        >
          {publishing
            ? 'Publishing…'
            : busy
              ? 'Saving draft…'
              : error
                ? 'Draft needs attention; your changes are kept here.'
                : dirty
                  ? 'Unsaved changes'
                  : published
                    ? hasUnpublishedChanges
                      ? 'Draft saved · Unpublished changes'
                      : 'Published'
                    : id
                      ? 'Draft saved'
                      : 'Start writing to create a draft'}
        </p>
        {copyStatus && (
          <p role="status" className="text-xs text-muted-foreground">
            {copyStatus}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <Button size="sm" variant="outline" onClick={() => setPreview(p => !p)}>
          {preview ? 'Edit' : 'Preview'}
        </Button>
        {published && id && (
          <>
            <Button size="sm" variant="outline" asChild>
              <Link to="/content/$creationId" params={{ creationId: id }}>
                View publication
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void copyLink()}>
              Copy link
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy || publishing || (!dirty && !!id)}
          onClick={() => void save()}
        >
          Save draft
        </Button>
        <Button size="sm" disabled={busy || publishing} onClick={() => void publish()}>
          {published ? 'Publish update' : 'Publish'}
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>
          Close
        </Button>
      </div>
    </div>
  );
}
export function CreationPublicationFooter({
  draft,
  setHistory,
}: {
  draft: Draft;
  setHistory: Toggle;
}) {
  const { download, id, published, busy, publishing, publish } = draft;
  return (
    <div className="flex flex-wrap gap-3 border-t pt-4">
      <Button variant="outline" onClick={download}>
        Export creation
      </Button>
      <Button variant="outline" disabled={!id} onClick={() => setHistory(h => !h)}>
        Revision history
      </Button>
      {published && (
        <Button variant="outline" disabled={busy || publishing} onClick={() => void publish(true)}>
          Unpublish
        </Button>
      )}
    </div>
  );
}
