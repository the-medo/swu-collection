import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useCardDiscussion, useCreateCardComment } from '@/api/cards/useCardDiscussion.ts';
import { useUser } from '@/hooks/useUser.ts';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import DiscussionComments from '../../discussions/DiscussionComments.tsx';
import PostDocumentForm from '../../rich-text-editor/PostDocumentForm.tsx';

export default function CardRulesDiscussion({
  cardId,
  focusCommentId,
}: {
  cardId: string;
  focusCommentId?: string;
}) {
  const query = useCardDiscussion(cardId);
  const mutation = useCreateCardComment(cardId);
  const user = useUser();
  const [writing, setWriting] = useState(false);

  // Keep an in-progress first draft if a background refresh discovers a discussion.
  if (query.data && !writing)
    return (
      <DiscussionComments
        key={query.data}
        discussionId={query.data}
        focusCommentId={focusCommentId}
        ariaLabel="Card rules and discussion"
      />
    );

  return (
    <section aria-label="Card rules and discussion" className="min-w-0">
      <Card className="min-w-0 rounded-xl shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b px-5 py-4">
          <h3 className="mb-0! text-lg!">Comments</h3>
          {!writing && query.isSuccess && (
            <SignInWrapper text="Sign in to comment">
              <Button variant="outline" size="sm" onClick={() => setWriting(true)}>
                <MessageSquarePlus aria-hidden="true" />
                Write a comment
              </Button>
            </SignInWrapper>
          )}
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 p-5">
          {writing && user ? (
            <PostDocumentForm
              type="comments"
              initialPost={null}
              submitLabel="Post comment"
              busy={mutation.isPending}
              onSave={content => mutation.mutateAsync(content)}
              onClose={() => setWriting(false)}
            />
          ) : query.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading comments…
            </p>
          ) : query.isError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>{query.error.message}</p>
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-1 rounded-lg bg-muted/20 p-4">
              <p className="text-sm font-medium">No comments yet.</p>
              <p className="text-sm text-muted-foreground">
                Ask a rules question or start a discussion about this card.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
