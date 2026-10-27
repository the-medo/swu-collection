import { Heart, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useFollowStatuses, useSetFollow } from '@/api/follows';
import { useUser } from '@/hooks/useUser.ts';
import type { FollowKind, FollowStatus } from '../../../../../shared/types/follows.ts';

type FollowButtonProps = {
  kind: FollowKind;
  id: string;
  name: string;
  status?: FollowStatus;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
};

export function FollowButton(props: FollowButtonProps) {
  const user = useUser();
  if (!user && props.kind === 'creators') return null;
  // A pending request belongs to the original account and target even if a
  // profile navigation or session change reuses this component.
  return (
    <FollowButtonState key={JSON.stringify([user?.id, props.kind, props.id])} {...props} />
  );
}

function FollowButtonState({ kind, id, name, status, loading, error, onRetry }: FollowButtonProps) {
  const user = useUser();
  const mutation = useSetFollow(kind, id);
  if (error)
    return (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry follow status
      </Button>
    );
  if (loading)
    return (
      <Button variant="outline" size="sm" disabled>
        Loading follows…
      </Button>
    );
  if (!status) return null;
  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-2 ${kind === 'creators' ? 'justify-end' : ''}`}
    >
      {user && status.canFollow && (
        <Button
          variant={status.following ? 'secondary' : 'outline'}
          size="sm"
          aria-label={`${status.following ? 'Unfollow' : 'Follow'} ${name}`}
          aria-pressed={status.following}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(!status.following)}
        >
          {kind === 'creators' ? (
            <Heart
              className={status.following ? 'size-4 fill-current' : 'size-4'}
              aria-hidden="true"
            />
          ) : status.following ? (
            <UserCheck className="size-4" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {status.following ? 'Following' : 'Follow'}
        </Button>
      )}
      {kind === 'users' && (
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {status.followerCount.toLocaleString()}{' '}
          {status.followerCount === 1 ? 'follower' : 'followers'}
        </span>
      )}
      {mutation.error && (
        <p role="alert" className="w-full break-words text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}

export function ProfileFollowButton({
  kind,
  id,
  name,
}: {
  kind: FollowKind;
  id: string;
  name: string;
}) {
  const query = useFollowStatuses(kind, [id]);
  return (
    <FollowButton
      kind={kind}
      id={id}
      name={name}
      status={query.data?.[id]}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );
}
