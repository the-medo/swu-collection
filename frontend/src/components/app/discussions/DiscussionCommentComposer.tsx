import { useCallback, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getDiscussionComment,
  useDiscussionCommentMutation,
} from '@/api/discussions/useDiscussion.ts';
import type { DiscussionComment } from '../../../../../shared/types/discussions.ts';
import PostDocumentForm, { type PostDraftState } from '../rich-text-editor/PostDocumentForm.tsx';
import { useCommentComposerPortal } from './useCommentComposerPortal.ts';

export type CommentComposer = PostDraftState & {
  id: string;
  draft: DiscussionComment | null;
  replyTo: DiscussionComment | null;
  path: string[];
};

export default function DiscussionCommentComposer({
  discussionId,
  composer,
  registerInlineSlot,
  onChanged,
  onDraftStateChange,
  onClose,
}: {
  discussionId: string;
  composer: CommentComposer;
  registerInlineSlot: (id: string, ref: (node: HTMLDivElement | null) => void) => () => void;
  onChanged?: () => void;
  onDraftStateChange: (id: string, state: PostDraftState) => void;
  onClose: (id: string) => void;
}) {
  const mutation = useDiscussionCommentMutation(discussionId, onChanged);
  const [host] = useState(() => document.createElement('div'));
  const { inlineSlot, fallbackSlot } = useCommentComposerPortal(host);
  useLayoutEffect(
    () => registerInlineSlot(composer.id, inlineSlot),
    [composer.id, inlineSlot, registerInlineSlot],
  );
  const reportDraft = useCallback(
    (state: PostDraftState) => onDraftStateChange(composer.id, state),
    [composer.id, onDraftStateChange],
  );
  return (
    <>
      <div ref={fallbackSlot} className="min-w-0 empty:hidden" />
      {createPortal(
        <div
          className="space-y-3 rounded-lg bg-muted/20 p-3 sm:p-4"
          data-comment-composer={composer.id}
        >
          {composer.replyTo && (
            <p className="text-xs text-muted-foreground">
              Replying to {composer.replyTo.author?.displayName ?? 'a comment'}
            </p>
          )}
          {composer.draft && <p className="text-xs text-muted-foreground">Editing your comment</p>}
          <PostDocumentForm
            type="comments"
            initialPost={composer.draft}
            submitLabel={
              composer.draft ? 'Save comment' : composer.replyTo ? 'Post reply' : 'Post comment'
            }
            busy={mutation.isPending}
            protectNavigation={false}
            onDraftStateChange={reportDraft}
            onSave={(content, revision) =>
              mutation.mutateAsync(
                composer.draft
                  ? { action: 'edit', commentId: composer.draft.id, content, revision: revision! }
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
                      return await mutation.mutateAsync({ action: 'create', content, parentId });
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
            onClose={() => onClose(composer.id)}
          />
        </div>,
        host,
        composer.id,
      )}
    </>
  );
}
