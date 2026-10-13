import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { hubApi, useSaveCreation, usePublishCreation } from '@/api/creators';
import {
  creationDocumentSchema,
  type Creation,
  type CreationDocument,
} from '../../../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../../../shared/posts/content.ts';

const initialDocument = (): CreationDocument => ({
  title: '',
  summary: '',
  videoDescription: '',
  medium: 'article',
  body: emptyPostDocument(),
  coverUrl: '',
  sourceUrl: '',
  language: 'en',
  tags: [],
  references: [],
  chapters: [],
  relevance: 'primary',
  freshness: 'current',
  season: '',
  sponsorship: '',
  series: '',
  seriesOrder: 0,
  pinned: false,
});
/** Owns persistence and optimistic revisions; rendering changes never reset a dirty draft. */
export function useCreationDraft({
  creatorId,
  initial,
  onClose,
}: {
  creatorId: string;
  initial?: Creation;
  onClose: () => void;
}) {
  const [document, setDocument] = useState(initial?.document ?? initialDocument);
  const [id, setId] = useState(initial?.id),
    [revision, setRevision] = useState(initial?.revision);
  const [saved, setSaved] = useState(() => JSON.stringify(document));
  const [error, setError] = useState<Error>(),
    [busy, setBusy] = useState(false),
    [generation, setGeneration] = useState(0);
  const [published, setPublished] = useState(!!initial?.publishedAt);
  const allowLeave = useRef(false);
  const saving = useRef(false),
    latest = useRef(document),
    draftId = useRef(id),
    currentRevision = useRef(revision);
  latest.current = document;
  draftId.current = id;
  currentRevision.current = revision;
  const dirty = JSON.stringify(document) !== saved;
  const saveMutation = useSaveCreation(),
    publishMutation = usePublishCreation();
  const saveFn = useRef(saveMutation.mutateAsync);
  saveFn.current = saveMutation.mutateAsync;
  const save = useCallback(
    async (explicit = true) => {
      if (saving.current) return null;
      const parsed = creationDocumentSchema.safeParse(latest.current);
      if (!parsed.success) {
        if (explicit)
          setError(
            new Error(
              parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · '),
            ),
          );
        return null;
      }
      saving.current = true;
      setBusy(true);
      // Compare the editor snapshot, not the schema-normalized key order.
      const snapshot = JSON.stringify(latest.current);
      try {
        const result = await saveFn.current({
          creatorId,
          document: parsed.data,
          id: draftId.current,
          revision: currentRevision.current,
        });
        draftId.current = result.id;
        currentRevision.current = result.revision;
        setId(result.id);
        setRevision(result.revision);
        setSaved(snapshot);
        setError(undefined);
        return result;
      } catch (failure) {
        setError(failure instanceof Error ? failure : new Error('Could not save this draft.'));
        return null;
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    [creatorId],
  );
  useEffect(() => {
    if (!dirty || error || busy) return;
    const timer = window.setTimeout(() => {
      void save(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [document, dirty, error, busy, save]);
  useBlocker({
    shouldBlockFn: () =>
      !allowLeave.current && dirty && !window.confirm('Leave with unsaved changes?'),
    enableBeforeUnload: dirty,
  });
  const update = (patch: Partial<CreationDocument>) =>
    setDocument(previous => ({ ...previous, ...patch }));
  const publish = async (unpublish = false) => {
    if (
      unpublish &&
      !window.confirm('Remove this publication from public discovery? Your draft will remain.')
    )
      return;
    const result =
      unpublish && id
        ? { id, revision: revision! }
        : dirty || !id
          ? await save()
          : { id, revision: revision! };
    if (!result) return;
    try {
      await publishMutation.mutateAsync({ ...result, unpublish });
      setPublished(!unpublish);
      setError(undefined);
    } catch (failure) {
      setError(failure as Error);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
    );
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${document.title || 'creation'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const resolveConflict = async (keepLocal: boolean) => {
    if (
      !id ||
      !window.confirm(
        keepLocal
          ? 'Save your version over the latest saved draft? The other version remains in revision history.'
          : 'Replace your unsaved changes with the latest saved draft?',
      )
    )
      return;
    setBusy(true);
    try {
      const current = await hubApi.draft(id);
      currentRevision.current = current.revision;
      setRevision(current.revision);
      setPublished(!!current.publishedAt);
      if (keepLocal) await save();
      else {
        setDocument(current.document);
        setSaved(JSON.stringify(current.document));
        setGeneration(g => g + 1);
        setError(undefined);
      }
    } catch (failure) {
      setError(failure as Error);
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (!dirty || window.confirm('Close with unsaved changes?')) {
      allowLeave.current = true;
      onClose();
    }
  };
  const restore = (document: CreationDocument) => {
    if (
      !window.confirm(
        'Restore this revision into your draft? The public version will stay as it is.',
      )
    )
      return;
    setDocument(document);
    setGeneration(g => g + 1);
    setError(undefined);
  };
  return {
    document,
    id,
    error,
    busy,
    dirty,
    published,
    generation,
    setGeneration,
    update,
    save,
    publish,
    publishing: publishMutation.isPending,
    close,
    download,
    resolveConflict,
    restore,
    retry: () => {
      setError(undefined);
      void save();
    },
  };
}
