import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { useUser } from '@/hooks/useUser.ts';
import {
  getDiscussionComment,
  useDiscussion,
  useDiscussionComments,
  useDiscussionCommentMutation,
  useDiscussionThread,
} from '@/api/discussions/useDiscussion.ts';
import type { DiscussionComment } from '../../../../../shared/types/discussions.ts';
import PostDocumentForm from '../rich-text-editor/PostDocumentForm.tsx';
import CommentCard from './CommentCard.tsx';
import { useCommentComposerPortal } from './useCommentComposerPortal.ts';

type ThreadProps = {
  discussionId: string;
  canModerate: boolean;
  editing: boolean;
  expanded: Map<string, boolean>;
  focusPath: DiscussionComment[];
  focusCommentId?: string;
  composerTargetId?: string;
  composerSlot: (node: HTMLDivElement | null) => void;
  onToggle: (id: string, open: boolean) => void;
  onEdit: (comment: DiscussionComment) => void;
  onReply: (comment: DiscussionComment) => void;
  onChanged?: () => void;
};
function CommentThread({
  comment,
  composerSlot,
  ...props
}: ThreadProps & { comment: DiscussionComment }) {
  const linkedReply = props.focusPath.find(node => node.parentId === comment.id);
  const expanded = props.expanded.get(comment.id);
  const onToggle = props.onToggle;
  const open = comment.replyCount === 1 || (expanded ?? !!linkedReply);
  useEffect(() => {
    // Keep an automatically shown reply visible when more replies arrive.
    if (comment.replyCount === 1 && expanded !== true) onToggle(comment.id, true);
  }, [comment.id, comment.replyCount, expanded, onToggle]);
  const included = comment.replies !== undefined;
  const query = useDiscussionComments(
    props.discussionId,
    comment.id,
    open && !included,
    comment.replies,
  );
  const refetch = query.refetch;
  const loadedReplyCount = query.data?.pages
    .flatMap(page => page.data)
    .reduce((count, reply) => count + (reply.deletedAt ? 0 : 1) + reply.replyCount, 0);
  const previousThread = useRef({ count: comment.replyCount, open: false });
  useEffect(() => {
    const previous = previousThread.current;
    previousThread.current = { count: comment.replyCount, open };
    if (
      open &&
      !included &&
      (!previous.open || previous.count !== comment.replyCount) &&
      (!previous.open || query.hasNextPage || loadedReplyCount !== comment.replyCount)
    )
      void refetch({ cancelRefetch: false });
  }, [comment.replyCount, included, loadedReplyCount, open, query.hasNextPage, refetch]);
  const replies = new Map(
    query.data?.pages.flatMap(page => page.data).map(reply => [reply.id, reply]),
  );
  if (linkedReply && !replies.has(linkedReply.id)) replies.set(linkedReply.id, linkedReply);
  return (
    <div data-comment-thread={comment.id} className="min-w-0 border-t first:border-t-0">
      <CommentCard
        comment={comment}
        canModerate={props.canModerate}
        editing={props.editing}
        onEdit={() => props.onEdit(comment)}
        onReply={() => props.onReply(comment)}
        onChanged={props.onChanged}
        focused={comment.id === props.focusCommentId}
        threadAction={
          comment.replyCount >= 2 ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1 text-xs text-muted-foreground"
              aria-expanded={open}
              disabled={open && props.editing}
              title={
                open && props.editing
                  ? 'Finish or cancel your comment before hiding replies.'
                  : undefined
              }
              onClick={() => props.onToggle(comment.id, !open)}
            >
              {open ? 'Hide replies' : `View thread (${comment.replyCount} replies)`}
            </Button>
          ) : undefined
        }
      />
      {props.composerTargetId === comment.id && (
        <div
          ref={composerSlot}
          data-comment-composer-for={comment.id}
          className="mb-3 min-w-0 empty:hidden sm:ml-11"
        />
      )}
      {(comment.replyCount > 0 || open) && (
        <div className="ml-3 min-w-0">
          {open && (
            <div
              role="region"
              aria-label="Comment replies"
              className="min-w-0 border-l border-border/70 pl-2 sm:pl-3"
            >
              {query.isPending && (
                <p role="status" className="text-xs">
                  Loading replies…
                </p>
              )}
              {query.isError && (
                <p role="alert" className="text-xs">
                  {query.error.message}{' '}
                  <Button variant="link" size="sm" onClick={() => void query.refetch()}>
                    Retry
                  </Button>
                </p>
              )}
              {[...replies.values()]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
                .map(reply => (
                  <CommentThread
                    key={reply.id}
                    comment={reply}
                    composerSlot={composerSlot}
                    {...props}
                  />
                ))}
              {query.hasNextPage && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  Load more replies
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default function DiscussionComments({
  discussionId,
  ariaLabel = 'Discussion comments',
  accessDenied = false,
  unavailableContent,
  onChanged,
  focusCommentId,
}: {
  discussionId: string;
  ariaLabel?: string;
  accessDenied?: boolean;
  unavailableContent?: ReactNode;
  onChanged?: () => void;
  focusCommentId?: string;
}) {
  const info = useDiscussion(discussionId);
  const denied = accessDenied || info.error?.status === 403 || info.error?.status === 404;
  const query = useDiscussionComments(discussionId, undefined, !denied);
  const focused = useDiscussionThread(discussionId, focusCommentId);
  const mutation = useDiscussionCommentMutation(discussionId, onChanged);
  const user = useUser();
  const [composer, setComposer] = useState<{
    draft: DiscussionComment | null;
    replyTo: DiscussionComment | null;
  } | null>(null);
  const [composerHost] = useState(() => document.createElement('div'));
  const { inlineSlot, fallbackSlot } = useCommentComposerPortal(composerHost);
  const composerTargetId = composer?.draft?.id ?? composer?.replyTo?.id;
  const [expanded, setExpanded] = useState(new Map<string, boolean>());
  const toggleThread = useCallback((id: string, open: boolean) => {
    setExpanded(previous =>
      previous.get(id) === open ? previous : new Map(previous).set(id, open),
    );
  }, []);
  const [expandedFor, setExpandedFor] = useState(focusCommentId);
  if (expandedFor !== focusCommentId) {
    setExpandedFor(focusCommentId);
    setExpanded(new Map());
  }
  const section = useRef<HTMLElement>(null);
  const focusAttempt = useRef<{ key: string; done: boolean; cancel?: () => void }>({
    key: '',
    done: false,
  });
  const focusPath = denied || focused.isError || !focusCommentId ? [] : (focused.data?.path ?? []);
  const roots = new Map(
    query.data?.pages.flatMap(page => page.data).map(comment => [comment.id, comment]),
  );
  const linkedRoot = focusPath[0];
  if (linkedRoot && !roots.has(linkedRoot.id)) roots.set(linkedRoot.id, linkedRoot);
  useEffect(() => {
    const attempt: { key: string; done: boolean; cancel?: () => void } = {
      key: `${discussionId}:${focusCommentId}`,
      done: !focusCommentId,
    };
    focusAttempt.current = attempt;
    const interact = () => {
      attempt.done = true;
      attempt.cancel?.();
    };
    const actions = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;
    for (const action of actions)
      window.addEventListener(action, interact, { once: true, passive: true, capture: true });
    return () => {
      attempt.cancel?.();
      for (const action of actions) window.removeEventListener(action, interact, true);
    };
  }, [discussionId, focusCommentId]);
  useEffect(() => {
    const attempt = focusAttempt.current;
    if (
      !focusCommentId ||
      denied ||
      focused.isError ||
      !focused.data ||
      attempt.key !== `${discussionId}:${focusCommentId}` ||
      attempt.done
    )
      return;
    const container = section.current;
    if (!container) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const stop = () => {
      mutations.disconnect();
      sizes.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
    const queue = () => {
      if (attempt.done) {
        stop();
        return;
      }
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      // Context can resolve before root/reply pages and published content. Focus
      // once those initial placeholders are gone and the layout has settled.
      if (container.parentElement?.querySelector('[role="status"]')) return;
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (attempt.done || container.parentElement?.querySelector('[role="status"]')) return;
          const target = container.querySelector<HTMLElement>(
            `[data-comment-id="${focusCommentId}"]`,
          );
          if (!target) return;
          attempt.done = true;
          stop();
          if (
            document.activeElement &&
            document.activeElement !== target &&
            container.contains(document.activeElement)
          )
            return;
          target.scrollIntoView({ block: 'center', behavior: 'instant' });
          target.focus({ preventScroll: true });
        });
      });
    };
    const mutations = new MutationObserver(queue);
    const sizes = new ResizeObserver(queue);
    const surface = container.parentElement ?? container;
    mutations.observe(surface, { childList: true, subtree: true });
    sizes.observe(surface);
    attempt.cancel = stop;
    queue();
    return () => {
      stop();
      if (attempt.cancel === stop) attempt.cancel = undefined;
    };
  }, [denied, discussionId, focusCommentId, focused.data, focused.isError]);
  const close = () => {
    const parentId = composer?.replyTo?.id ?? composer?.draft?.parentId;
    if (parentId) setExpanded(previous => new Map(previous).set(parentId, true));
    setComposer(null);
  };
  return (
    <section ref={section} aria-label={ariaLabel} className="min-w-0">
      <Card className="min-w-0 rounded-xl shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b px-5 py-4 sm:px-7">
          <h3
            aria-label={!denied && info.data ? `Comments (${info.data.total})` : undefined}
            className="mb-0! flex items-center gap-2.5 text-lg!"
          >
            Comments
            {!denied && info.data && (
              <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-medium tracking-normal text-muted-foreground">
                {info.data.total}
              </span>
            )}
          </h3>
          {!denied && !info.isError && !query.isError && !composer && (
            <SignInWrapper text="Sign in to comment">
              <Button
                variant="outline"
                size="sm"
                disabled={!info.data}
                onClick={() => setComposer({ draft: null, replyTo: null })}
              >
                <MessageSquarePlus aria-hidden="true" />
                Write a comment
              </Button>
            </SignInWrapper>
          )}
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 p-5 sm:px-7">
          {denied || info.isError || query.isError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>
                {info.error?.message ??
                  query.error?.message ??
                  'This discussion is unavailable, or you do not have access to it.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void info.refetch();
                  void query.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {composer && user && (
            <>
              <div ref={fallbackSlot} className="min-w-0 empty:hidden" />
              {createPortal(
                <div className="space-y-3 rounded-lg bg-muted/20 p-3 sm:p-4">
                  {composer.replyTo && (
                    <p className="text-xs text-muted-foreground">
                      Replying to {composer.replyTo.author?.displayName ?? 'a comment'}
                    </p>
                  )}
                  {composer.draft && (
                    <p className="text-xs text-muted-foreground">Editing your comment</p>
                  )}
                  <PostDocumentForm
                    key={composer.draft?.id ?? composer.replyTo?.id ?? 'new'}
                    type="comments"
                    initialPost={composer.draft}
                    submitLabel={
                      composer.draft
                        ? 'Save comment'
                        : composer.replyTo
                          ? 'Post reply'
                          : 'Post comment'
                    }
                    busy={mutation.isPending}
                    onSave={(content, revision) =>
                      mutation.mutateAsync(
                        composer.draft
                          ? {
                              action: 'edit',
                              commentId: composer.draft.id,
                              content,
                              revision: revision!,
                            }
                          : { action: 'create', content, parentId: composer.replyTo?.id },
                      )
                    }
                    getLatest={
                      composer.draft
                        ? () => getDiscussionComment(discussionId, composer.draft!.id)
                        : undefined
                    }
                    onSaveAsNew={
                      composer.draft || composer.replyTo
                        ? async content => {
                            const parentId = composer.draft?.parentId ?? composer.replyTo?.id;
                            try {
                              return await mutation.mutateAsync({
                                action: 'create',
                                content,
                                parentId,
                              });
                            } catch (error) {
                              if (
                                !parentId ||
                                !(error instanceof Error) ||
                                !('status' in error) ||
                                error.status !== 410
                              )
                                throw error;
                              return mutation.mutateAsync({ action: 'create', content });
                            }
                          }
                        : undefined
                    }
                    onClose={close}
                  />
                </div>,
                composerHost,
                composer.draft?.id ?? composer.replyTo?.id ?? 'new',
              )}
            </>
          )}
          {denied && unavailableContent}
          {!denied && focusCommentId && focused.isError && (
            <p role="alert" className="text-sm">
              {focused.error.message}
            </p>
          )}
          {!denied && !query.isError && (
            <div>
              {query.isPending && (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading comments…
                </p>
              )}
              {!query.isPending && !roots.size && !composer && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/20 p-4 sm:gap-4 sm:p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                    <MessageCircle aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-5!">No comments yet.</p>
                    <p className="text-sm leading-6! text-muted-foreground">
                      Have a question or a suggestion? Start the conversation.
                    </p>
                  </div>
                </div>
              )}
              {[...roots.values()]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
                .map(comment => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    discussionId={discussionId}
                    canModerate={info.data?.canModerate ?? false}
                    editing={!!composer}
                    expanded={expanded}
                    focusPath={focusPath}
                    focusCommentId={focusCommentId}
                    composerTargetId={composerTargetId}
                    composerSlot={inlineSlot}
                    onToggle={toggleThread}
                    onEdit={draft => setComposer({ draft, replyTo: null })}
                    onReply={replyTo => setComposer({ draft: null, replyTo })}
                    onChanged={onChanged}
                  />
                ))}
              {query.hasNextPage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  Load more comments
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
