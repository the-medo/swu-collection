import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useReloadCreationDraft, useSaveCreation, usePublishCreation } from '@/api/creators';
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
// Older non-video drafts could contain video fields. Keep those in revision history,
// but exclude them from the editable draft so hidden fields cannot prevent publication.
function editableDocument(document: CreationDocument): CreationDocument {
  if (document.medium === 'video') return document;
  return {
    ...document,
    videoDescription: '',
    chapters: [],
    references: document.references.map(reference => ({ ...reference, startSeconds: null })),
  };
}
/** Owns persistence and optimistic revisions; rendering changes never reset a dirty draft. */
export function useCreationDraft({
  creatorId,
  initial,
  medium = 'article',
  onClose,
}: {
  creatorId: string | null;
  initial?: Creation;
  medium?: CreationDocument['medium'];
  onClose: () => void;
}) {
  const identity = useRef({ creatorId, ownershipRevision: initial?.ownershipRevision ?? 1 });
  const [activeCreatorId, setActiveCreatorId] = useState(creatorId);
  const [document, setDocument] = useState(() =>
    editableDocument(initial?.document ?? { ...initialDocument(), medium }),
  );
  const [id, setId] = useState(initial?.id),
    [revision, setRevision] = useState(initial?.revision);
  const [saved, setSaved] = useState(() => JSON.stringify(initial?.document ?? document));
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
  const reloadDraft = useReloadCreationDraft();
  const saveFn = useRef(saveMutation.mutateAsync);
  saveFn.current = saveMutation.mutateAsync;
  const save = useCallback(async (explicit = true) => {
    if (saving.current) return null;
    const parsed = creationDocumentSchema.safeParse(latest.current);
    if (!parsed.success) {
      if (explicit)
        setError(
          new Error(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · ')),
        );
      return null;
    }
    saving.current = true;
    setBusy(true);
    // Compare the editor snapshot, not the schema-normalized key order.
    const snapshot = JSON.stringify(latest.current);
    try {
      const result = await saveFn.current({
        ...identity.current,
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
  }, []);
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
      await publishMutation.mutateAsync({
        ...result,
        unpublish,
        ownershipRevision: identity.current.ownershipRevision,
      });
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
      const current = await reloadDraft.mutateAsync(id);
      identity.current = {
        creatorId: current.creatorId,
        ownershipRevision: current.ownershipRevision,
      };
      setActiveCreatorId(current.creatorId);
      currentRevision.current = current.revision;
      setRevision(current.revision);
      setPublished(!!current.publishedAt);
      if (keepLocal) await save();
      else {
        setDocument(editableDocument(current.document));
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
    setDocument(editableDocument(document));
    setGeneration(g => g + 1);
    setError(undefined);
  };
  return {
    activeCreatorId,
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
