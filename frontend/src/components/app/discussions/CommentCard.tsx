import { lazy, Suspense, type ReactNode } from 'react';
import { Pencil, Reply, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { UserProfilePopover } from '@/components/app/users/UserProfilePopover.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useDiscussionCommentMutation } from '@/api/discussions/useDiscussion.ts';
import type { DiscussionComment } from '../../../../../shared/types/discussions.ts';
const PostContent = lazy(() =>
  import('../rich-text-editor/blocknote/BlocknoteEditor.tsx').then(module => ({
    default: module.PostContent,
  })),
);
export default function CommentCard({
  comment,
  canModerate = false,
  editing = false,
  onEdit,
  onReply,
  onChanged,
  focused = false,
  threadAction,
}: {
  comment: DiscussionComment;
  canModerate?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  onReply?: () => void;
  onChanged?: () => void;
  focused?: boolean;
  threadAction?: ReactNode;
}) {
  const user = useUser();
  const mutation = useDiscussionCommentMutation(comment.discussionId, onChanged);
  const owned = !!comment.authorId && user?.id === comment.authorId;
  const deleted = !!comment.deletedAt;
  return (
    <div
      id={`comment-${comment.id}`}
      data-comment-id={comment.id}
      tabIndex={-1}
      className={`flex min-w-0 items-start gap-3 py-3 outline-none ${focused ? '-mx-1 rounded-lg bg-primary/5 px-1 ring-1 ring-primary/30' : ''}`}
    >
      <Avatar data-comment-avatar className="size-8 shrink-0">
        <AvatarImage
          src={comment.author?.image ?? undefined}
          alt={comment.author?.displayName ?? 'Deleted comment'}
        />
        <AvatarFallback className="text-xs">
          {comment.author?.displayName.slice(0, 2).toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <article
        aria-label={`Comment by ${comment.author?.displayName ?? 'deleted user'}`}
        className="min-w-0 flex-1"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {comment.author && !deleted ? (
              <UserProfilePopover user={comment.author}>
                <button
                  type="button"
                  className="break-words text-left text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {comment.author.displayName}
                </button>
              </UserProfilePopover>
            ) : (
              <span className="text-xs text-muted-foreground">Deleted comment</span>
            )}
            <time
              dateTime={comment.createdAt}
              title={new Date(comment.createdAt).toLocaleString()}
              className="text-xs text-muted-foreground"
            >
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              {comment.revision > 1 && !deleted && ' · edited'}
            </time>
          </div>
          {!deleted && (
            <div className="flex shrink-0 gap-0.5">
              {owned && onEdit && (
                <Button
                  size="iconSmall"
                  variant="ghost"
                  aria-label="Edit comment"
                  disabled={editing || mutation.isPending}
                  onClick={onEdit}
                >
                  <Pencil />
                </Button>
              )}
              {(owned || canModerate) && (
                <Button
                  size="iconSmall"
                  variant="ghost"
                  aria-label="Delete comment"
                  disabled={editing || mutation.isPending}
                  onClick={() => {
                    if (window.confirm('Delete this comment? Replies will remain visible.'))
                      mutation.mutate({ action: 'delete', commentId: comment.id });
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          )}
        </div>
        {!deleted && (
          <div className="min-w-0 text-sm [&_.rte-published_.bn-block-content]:px-0! [&_.rte-published_.bn-block-content]:py-0! [&_.rte-published_.bn-editor]:bg-transparent! [&_.rte-published_.bn-inline-content]:text-sm!">
            <Suspense fallback={<p role="status">Loading comment…</p>}>
              <PostContent
                type="comments"
                key={`${comment.id}:${comment.revision}`}
                content={comment.content}
              />
            </Suspense>
          </div>
        )}
        {(threadAction || (!deleted && onReply && comment.depth < 5)) && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {threadAction}
            {!deleted && onReply && comment.depth < 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs text-muted-foreground"
                disabled={editing}
                onClick={onReply}
              >
                <Reply className="size-3.5" />
                Reply
              </Button>
            )}
          </div>
        )}
        {mutation.error && (
          <p role="alert" className="text-xs text-destructive">
            {mutation.error.message}
          </p>
        )}
      </article>
    </div>
  );
}
