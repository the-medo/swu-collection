import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import {
  emptyPostDocument,
  isPostEmpty,
  postDocumentSchemas,
  postValidationMessage,
  trimTrailingEmptyBlocks,
  type EditorType,
  type PostDocument,
} from '../../../../../shared/posts/content.ts';
import { commentContentSchema } from '../../../../../shared/types/discussions.ts';
import type { ErrorWithStatus } from '../../../../../types/ErrorWithStatus.ts';

const PostEditor = lazy(() => import('./blocknote/BlocknoteEditor.tsx'));
type SavedDocument = { content: PostDocument; revision: number };
export type PostDraftState = { empty: boolean; dirty: boolean; busy: boolean };

export default function PostDocumentForm({
  type,
  documentLabel,
  initialPost,
  submitLabel,
  busy,
  onSave,
  onClose,
  getLatest,
  onSaveAsNew,
  onDraftStateChange,
  protectNavigation = true,
}: {
  type: EditorType;
  documentLabel?: string;
  initialPost: SavedDocument | null;
  submitLabel: string;
  busy: boolean;
  onSave: (content: PostDocument, revision: number | null) => Promise<unknown>;
  onClose: () => void;
  getLatest?: () => Promise<SavedDocument | null>;
  onSaveAsNew?: (content: PostDocument) => Promise<unknown>;
  onDraftStateChange?: (state: PostDraftState) => void;
  protectNavigation?: boolean;
}) {
  const label = documentLabel ?? (type === 'rich' ? 'article' : 'comment');
  const form = useRef<HTMLDivElement>(null);
  useEffect(() => {
    form.current?.focus();
  }, []);
  const [initialContent, setInitialContent] = useState(() =>
    trimTrailingEmptyBlocks(initialPost?.content ?? emptyPostDocument()),
  );
  const [content, setContent] = useState(initialContent);
  const contentRef = useRef(content);
  const [revision, setRevision] = useState(initialPost?.revision ?? null);
  const [generation, setGeneration] = useState(0);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [error, setError] = useState<ErrorWithStatus>();
  const [recovering, setRecovering] = useState(false);
  const disabled = busy || recovering;
  const conflict = error?.status === 409;
  useEffect(() => {
    onDraftStateChange?.({ empty: isPostEmpty(content), dirty, busy: disabled });
  }, [content, dirty, disabled, onDraftStateChange]);
  useBlocker({
    shouldBlockFn: ({ current, next }) =>
      protectNavigation &&
      dirtyRef.current &&
      (current.pathname !== next.pathname ||
        JSON.stringify(current.search) !== JSON.stringify(next.search)) &&
      !window.confirm(`Leave without saving your ${label}?`),
    enableBeforeUnload: protectNavigation && dirty,
  });
  const save = async (expectedRevision: number | null, asNew = false) => {
    const validation = (
      type === 'rich' ? postDocumentSchemas.rich : commentContentSchema
    ).safeParse(trimTrailingEmptyBlocks(content));
    if (!validation.success) {
      setError(new Error(postValidationMessage(validation.error)));
      return;
    }
    setError(undefined);
    try {
      if (asNew && onSaveAsNew) await onSaveAsNew(validation.data);
      else await onSave(validation.data, expectedRevision);
      dirtyRef.current = false;
      setDirty(false);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure : new Error(`Could not save this ${label}.`));
    }
  };
  const recover = async (replace: boolean) => {
    if (
      !getLatest ||
      !window.confirm(
        replace
          ? `Replace the saved ${label} with your draft?`
          : `Load the saved ${label} and discard your draft?`,
      )
    )
      return;
    setRecovering(true);
    try {
      const latest = await getLatest();
      if (replace) {
        setRevision(latest?.revision ?? null);
        await save(latest?.revision ?? null);
      } else {
        const next = trimTrailingEmptyBlocks(latest?.content ?? emptyPostDocument());
        setInitialContent(next);
        setContent(next);
        contentRef.current = next;
        setRevision(latest?.revision ?? null);
        setGeneration(value => value + 1);
        setDirty(false);
        dirtyRef.current = false;
        setError(undefined);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure
          : new Error(`Could not load the saved ${label}. Your draft is still here.`),
      );
    } finally {
      setRecovering(false);
    }
  };
  return (
    <div
      ref={form}
      role="group"
      aria-label={`Edit ${label}`}
      tabIndex={-1}
      className="min-w-0 space-y-3 outline-none"
    >
      <Suspense fallback={<p role="status">Loading editor…</p>}>
        <PostEditor
          type={type}
          key={generation}
          initialContent={initialContent}
          disabled={disabled}
          onChange={next => {
            // BlockNote also emits onChange when editable is toggled while saving.
            // Those events must not clear a failed save or mark a recovered draft dirty.
            const changed = JSON.stringify(contentRef.current) !== JSON.stringify(next);
            contentRef.current = next;
            setContent(next);
            if (!changed) return;
            setDirty(true);
            dirtyRef.current = true;
            setError(current =>
              current?.status === 409 || (current?.status === 410 && onSaveAsNew)
                ? current
                : undefined,
            );
          }}
        />
      </Suspense>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      {conflict && getLatest && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={disabled} onClick={() => void recover(false)}>
            Load saved {label}
          </Button>
          <Button variant="outline" disabled={disabled} onClick={() => void recover(true)}>
            Save my version instead
          </Button>
        </div>
      )}
      {error?.status === 410 && onSaveAsNew && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This comment was deleted. Your draft is still here.
          </p>
          <Button variant="outline" disabled={disabled} onClick={() => void save(null, true)}>
            Post as new comment
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled || !dirty || conflict || (error?.status === 410 && !!onSaveAsNew)}
          onClick={() => void save(revision)}
        >
          {busy ? 'Saving…' : submitLabel}
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => {
            if (!dirty || window.confirm(`Discard your unsaved ${label}?`)) {
              dirtyRef.current = false;
              onClose();
            }
          }}
        >
          Cancel
        </Button>
        {type === 'rich' && (
          <Button
            variant="ghost"
            disabled={disabled || isPostEmpty(content)}
            onClick={() => {
              if (
                !window.confirm(
                  `Clear this ${label}? Save to publish this change, or Cancel to keep the saved ${label}.`,
                )
              )
                return;
              const empty = emptyPostDocument();
              setContent(empty);
              contentRef.current = empty;
              setInitialContent(empty);
              setGeneration(value => value + 1);
              setDirty(true);
              dirtyRef.current = true;
            }}
          >
            Clear {label}
          </Button>
        )}
      </div>
    </div>
  );
}
