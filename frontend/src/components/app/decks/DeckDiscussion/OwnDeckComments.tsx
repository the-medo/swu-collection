import { Button } from '@/components/ui/button.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useGetOwnDeckComments } from '@/api/decks/useGetOwnDeckComments.ts';
import CommentCard from '../../discussions/CommentCard.tsx';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateDeckDiscussion } from '@/api/decks/discussionCache.ts';
import { cn } from '@/lib/utils.ts';

export default function OwnDeckComments({
  deckId,
  embedded = false,
}: {
  deckId: string;
  embedded?: boolean;
}) {
  const user = useUser();
  const client = useQueryClient();
  const query = useGetOwnDeckComments(deckId);
  if (!user) return null;
  if (query.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading your comments…
      </p>
    );
  if (query.isError)
    return (
      <div role="alert" className="space-y-2 text-sm">
        <p>Could not load your comments.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const comments = query.data.pages.flatMap(page => page.data);
  if (!comments.length) return null;
  const Heading = embedded ? 'h4' : 'h3';
  return (
    <section
      aria-label="Your comments on this deck"
      className={cn(
        'min-w-0 space-y-4',
        !embedded && 'mx-auto my-6 w-full max-w-3xl rounded-lg border bg-card p-4',
      )}
    >
      <Heading className="mb-0! text-base!">Your comments on this deck</Heading>
      <p className="text-sm text-muted-foreground">
        You can remove your comments even though this deck is unavailable.
      </p>
      <div className="divide-y">
        {comments.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            editing={false}
            onChanged={() => {
              void invalidateDeckDiscussion(client, deckId);
            }}
          />
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more comments'}
        </Button>
      )}
    </section>
  );
}
