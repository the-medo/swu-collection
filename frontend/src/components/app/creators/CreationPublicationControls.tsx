import type { Dispatch, SetStateAction } from 'react';
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
  const { busy, error, dirty, id, published, save, publish, publishing, close } = draft;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card/95 p-4 backdrop-blur">
      <div>
        <h2 className={creatorHeading}>{editing ? 'Edit creation' : 'New creation'}</h2>
        <p
          role="status"
          className="mt-1! mb-0! text-[11px]! leading-relaxed! text-muted-foreground"
        >
          {busy
            ? 'Saving draft…'
            : error
              ? 'Draft needs attention; your changes are kept here.'
              : dirty
                ? 'Unsaved changes'
                : id
                  ? 'Draft saved'
                  : 'Start writing to create a draft'}
          {published ? ' · Published version is separate' : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setPreview(p => !p)}>
          {preview ? 'Edit' : 'Preview'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void save()}>
          Save draft
        </Button>
        <Button disabled={busy || publishing} onClick={() => void publish()}>
          {published ? 'Publish update' : 'Publish'}
        </Button>
        <Button variant="ghost" onClick={close}>
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
