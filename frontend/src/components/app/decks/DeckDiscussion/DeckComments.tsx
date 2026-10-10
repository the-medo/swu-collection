import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import { useGetDeckDiscussion } from '@/api/decks/useGetDeckDiscussion.ts';
import { useGetDeckArticle } from '@/api/decks/useGetDeckArticle.ts';
import { invalidateDeckDiscussion } from '@/api/decks/discussionCache.ts';
import DiscussionComments from '../../discussions/DiscussionComments.tsx';
import OwnDeckComments from './OwnDeckComments.tsx';
export default function DeckComments({ deckId }: { deckId: string }) {
  const query = useGetDeckDiscussion(deckId);
  const access = useGetDeckArticle(deckId);
  const client = useQueryClient();
  const { deckComment } = useSearch({ strict: false });
  // Keep the composer mounted when access refresh clears the resource cache.
  const [known, setKnown] = useState<{ deckId: string; discussionId?: string }>({ deckId });
  if (known.deckId !== deckId || (query.data && known.discussionId !== query.data.id))
    setKnown({ deckId, discussionId: query.data?.id });
  const discussionId = query.data?.id ?? (known.deckId === deckId ? known.discussionId : undefined);
  const denied =
    access.error?.status === 403 ||
    access.error?.status === 404 ||
    query.error?.status === 403 ||
    query.error?.status === 404;
  if (!discussionId)
    return (
      <section aria-label="Deck comments" className="min-w-0">
        <Card className="min-w-0 rounded-xl shadow-none">
          <CardHeader className="border-b px-5 py-4 sm:px-7">
            <h3 className="mb-0! text-lg!">Comments</h3>
          </CardHeader>
          <CardContent className="space-y-4 p-5 sm:px-7">
            {query.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading comments…
              </p>
            ) : (
              <div role="alert" className="space-y-2 text-sm">
                <p>{query.error?.message}</p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              </div>
            )}
            {denied && <OwnDeckComments deckId={deckId} embedded />}
          </CardContent>
        </Card>
      </section>
    );
  return (
    <DiscussionComments
      key={discussionId}
      discussionId={discussionId}
      focusCommentId={deckComment}
      ariaLabel="Deck comments"
      accessDenied={denied}
      unavailableContent={<OwnDeckComments deckId={deckId} embedded />}
      onChanged={() => {
        void invalidateDeckDiscussion(client, deckId);
      }}
    />
  );
}
