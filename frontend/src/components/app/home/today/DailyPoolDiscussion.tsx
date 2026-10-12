import { useState } from 'react';
import { useGetDailyPoolDiscussion } from '@/api/card-pools/useGetDailyPoolDiscussion.ts';
import { Button } from '@/components/ui/button.tsx';
import DiscussionComments from '@/components/app/discussions/DiscussionComments.tsx';
import OwnDiscussionComments from '@/components/app/discussions/OwnDiscussionComments.tsx';

export default function DailyPoolDiscussion({
  poolId,
  focusCommentId,
}: {
  poolId: string;
  focusCommentId?: string;
}) {
  const query = useGetDailyPoolDiscussion(poolId);
  // Keep drafts mounted if a metadata refresh reports that access has changed.
  const [known, setKnown] = useState<{ poolId: string; discussionId?: string }>({ poolId });
  if (known.poolId !== poolId || (query.data && known.discussionId !== query.data.id))
    setKnown({ poolId, discussionId: query.data?.id });
  const discussionId = query.data?.id ?? (known.poolId === poolId ? known.discussionId : undefined);
  const denied = query.error?.status === 403 || query.error?.status === 404;
  const ownComments = (
    <OwnDiscussionComments
      target={{ attachmentType: 'daily-pool', attachmentId: poolId }}
      embedded
      title="Your comments on this pool"
      description="You can remove your comments even though this pool is unavailable."
    />
  );

  if (!discussionId)
    return (
      <div className="rounded-xl border bg-card p-5">
        {query.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading pool discussion…
          </p>
        ) : (
          <div role="alert" className="space-y-2 text-sm">
            <p>
              {denied ? 'This pool discussion is unavailable.' : 'Could not load this discussion.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {denied && ownComments}
      </div>
    );
  return (
    <DiscussionComments
      key={discussionId}
      discussionId={discussionId}
      ariaLabel="Pool discussion"
      focusCommentId={focusCommentId}
      accessDenied={denied}
      unavailableContent={ownComments}
    />
  );
}
