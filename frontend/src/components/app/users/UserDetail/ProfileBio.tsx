import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlocker } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { useSession } from '@/lib/auth-client.ts';
import { Button } from '@/components/ui/button.tsx';
import { getProfilePost, useProfilePost, useSaveProfilePost } from '@/api/posts/useProfilePost.ts';
import {
  emptyPostDocument,
  isPostEmpty,
  hasSwubaseContent,
  postDocumentSchemas,
  postValidationMessage,
  toSimplePostDocument,
  trimTrailingEmptyBlocks,
  type Post,
  type PostDocument,
} from '../../../../../../shared/posts/content.ts';

const PostEditor = lazy(() => import('../../rich-text-editor/blocknote/BlocknoteEditor.tsx'));
const PostContent = lazy(() =>
  import('../../rich-text-editor/blocknote/BlocknoteEditor.tsx').then(module => ({
    default: module.PostContent,
  })),
);

function BioForm({
  userId,
  post,
  onClose,
}: {
  userId: string;
  post: Post | null;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    formRef.current?.focus();
  }, []);
  const [content, setContent] = useState<PostDocument>(() =>
    trimTrailingEmptyBlocks(toSimplePostDocument(post?.content ?? emptyPostDocument())),
  );
  const contentRef = useRef(content);
  const [initialContent, setInitialContent] = useState(content);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [legacyWidgets, setLegacyWidgets] = useState(
    () => !!post && hasSwubaseContent(post.content),
  );
  const [dirty, setDirty] = useState(legacyWidgets);
  const [error, setError] = useState<string>();
  const save = useSaveProfilePost(userId);
  const [revision, setRevision] = useState(post?.revision ?? null);
  const [recovering, setRecovering] = useState(false);
  const busy = save.isPending || recovering;
  const conflict = !!save.error && 'status' in save.error && save.error.status === 409;
  const persist = async (expectedRevision: number | null) => {
    const result = postDocumentSchemas.simple.safeParse(trimTrailingEmptyBlocks(content));
    if (!result.success) {
      setError(postValidationMessage(result.error));
      return;
    }
    try {
      await save.mutateAsync({ content: result.data, revision: expectedRevision });
      setDirty(false);
      onClose();
    } catch {
      /* Keep the draft available after any failure. */
    }
  };
  const recover = async (replace: boolean) => {
    if (
      !window.confirm(
        replace
          ? 'Replace the bio saved in another tab with your current draft?'
          : 'Load the saved bio and discard your current draft?',
      )
    )
      return;
    setRecovering(true);
    setError(undefined);
    try {
      const latest = await getProfilePost(userId);
      if (replace) {
        setRevision(latest?.revision ?? null);
        await persist(latest?.revision ?? null);
      } else {
        const next = trimTrailingEmptyBlocks(
          toSimplePostDocument(latest?.content ?? emptyPostDocument()),
        );
        setContent(next);
        contentRef.current = next;
        setInitialContent(next);
        setEditorGeneration(generation => generation + 1);
        setRevision(latest?.revision ?? null);
        const converted = !!latest && hasSwubaseContent(latest.content);
        setLegacyWidgets(converted);
        setDirty(converted);
        save.reset();
      }
    } catch {
      setError('Could not load the saved bio. Your draft is still here; please try again.');
    } finally {
      setRecovering(false);
    }
  };
  useBlocker({
    shouldBlockFn: ({ current, next }) =>
      dirty &&
      current.pathname !== next.pathname &&
      !window.confirm('Leave without saving your bio?'),
    enableBeforeUnload: dirty,
  });
  return (
    <div
      ref={formRef}
      role="group"
      aria-label="Edit profile bio"
      tabIndex={-1}
      className="space-y-3 outline-none"
    >
      {legacyWidgets && (
        <p className="text-sm text-muted-foreground">
          Existing widgets will be saved as ordinary text and links.
        </p>
      )}
      <Suspense fallback={<p role="status">Loading editor…</p>}>
        <PostEditor
          type="simple"
          key={editorGeneration}
          initialContent={initialContent}
          disabled={busy}
          onChange={next => {
            const changed = JSON.stringify(contentRef.current) !== JSON.stringify(next);
            contentRef.current = next;
            setContent(next);
            if (!changed) return;
            setDirty(true);
            setError(undefined);
          }}
        />
      </Suspense>
      {(error || save.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? save.error?.message}
        </p>
      )}
      {conflict && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void recover(false)}>
            Load saved bio
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void recover(true)}>
            Save my version instead
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Button disabled={busy || !dirty || conflict} onClick={() => void persist(revision)}>
          {save.isPending ? 'Saving…' : 'Save bio'}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm('Discard your unsaved bio changes?')) onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="ghost"
          className="ml-auto"
          disabled={busy || isPostEmpty(content)}
          onClick={() => {
            if (
              !window.confirm(
                'Clear your bio? Save to publish this change, or Cancel to keep your current bio.',
              )
            )
              return;
            const empty = emptyPostDocument();
            setContent(empty);
            contentRef.current = empty;
            setInitialContent(empty);
            setLegacyWidgets(false);
            setEditorGeneration(generation => generation + 1);
            setDirty(true);
            setError(undefined);
          }}
        >
          Clear bio
        </Button>
      </div>
    </div>
  );
}

export function ProfileBio({
  userId,
  actionsContainer,
}: {
  userId: string;
  actionsContainer: HTMLElement | null;
}) {
  const session = useSession();
  const ownProfile = session.data?.user.id === userId;
  const query = useProfilePost(userId);
  const [editing, setEditing] = useState(false);
  const restoreActionFocus = useRef(false);
  const restoreFocusRef = useCallback((button: HTMLButtonElement | null) => {
    if (button && restoreActionFocus.current) {
      restoreActionFocus.current = false;
      button.focus();
    }
  }, []);
  // Snapshot the revision when opening: background refreshes must not silently authorize overwrites.
  const [draftPost, setDraftPost] = useState<Post | null>(null);
  if (query.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading bio…
      </p>
    );
  if (query.isError && !(ownProfile && editing))
    return (
      <div role="alert">
        Could not load this bio.{' '}
        <Button ref={restoreFocusRef} variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const empty = !query.data || isPostEmpty(query.data.content);
  if (empty && !ownProfile) return null;
  return (
    <section
      aria-label="Profile bio"
      className="min-w-0 space-y-3 [&_.rte-published_.bn-block-content]:px-0! [&_.rte-published_.bn-editor]:bg-transparent! [&_.rte-published_.bn-editor]:p-0!"
    >
      {ownProfile &&
        !editing &&
        actionsContainer &&
        createPortal(
          <Button
            ref={restoreFocusRef}
            variant="outline"
            onClick={() => {
              setDraftPost(query.data ?? null);
              setEditing(true);
            }}
          >
            <Pencil className="size-4" />
            {empty ? 'Add bio' : 'Edit bio'}
          </Button>,
          actionsContainer,
        )}
      {ownProfile && editing ? (
        <BioForm
          userId={userId}
          post={draftPost}
          onClose={() => {
            restoreActionFocus.current = true;
            setEditing(false);
          }}
        />
      ) : empty ? (
        <p className="text-sm text-muted-foreground">
          Tell other players about yourself, your favorite decks, or your next tournament.
        </p>
      ) : (
        <Suspense fallback={<p role="status">Loading bio…</p>}>
          <PostContent
            type="simple"
            key={`${query.data!.id}:${query.data!.revision}`}
            content={query.data!.content}
          />
        </Suspense>
      )}
    </section>
  );
}
