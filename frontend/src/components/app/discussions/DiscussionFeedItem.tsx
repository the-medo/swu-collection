import { useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { cn } from '@/lib/utils.ts';
import type { DiscussionType, RecentDiscussion } from '../../../../../shared/types/discussions.ts';
import { DiscussionThumbnail } from './DiscussionThumbnail.tsx';

const typeLabels: Record<DiscussionType, string> = {
  deck: 'Deck',
  'card-detail': 'Card',
  'daily-pool': 'Daily pool',
  forum: 'Forum',
};

export function DiscussionFeedItem({
  entry,
  compact = false,
}: {
  entry: RecentDiscussion;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'relative flex min-w-0 items-center gap-3 rounded-md',
        compact ? 'py-3' : 'py-5',
      )}
    >
      <DiscussionThumbnail thumbnail={entry.thumbnail} />
      <div className="min-w-0 flex-1">
        <a
          href={entry.targetUrl}
          onClick={event => {
            if (
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey &&
              event.button === 0
            ) {
              event.preventDefault();
              void navigate({ href: entry.targetUrl });
            }
          }}
          className="group block text-foreground! after:absolute after:inset-0 after:z-2 after:rounded-md after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-[var(--discussion-accent,hsl(var(--ring)))] focus-visible:after:outline-offset-2"
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {typeLabels[entry.type]}
            </span>
            <span
              className={cn(
                'truncate font-medium group-hover:text-[color:var(--discussion-accent,hsl(var(--primary)))] group-hover:underline',
                compact ? 'text-[13px]' : 'text-base',
              )}
            >
              {entry.targetName || 'Discussion'}
            </span>
          </span>
          <span
            className={cn(
              'mt-1 break-words leading-relaxed text-muted-foreground',
              compact ? 'line-clamp-2 text-[12px]' : 'line-clamp-3 text-sm',
            )}
          >
            {entry.preview || 'Join the conversation'}
          </span>
        </a>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
          {entry.author ? (
            <UserDisplay user={entry.author} className="relative z-3" />
          ) : (
            <span>Deleted user</span>
          )}
          <time
            className="relative z-3"
            dateTime={entry.createdAt}
            title={new Date(entry.createdAt).toLocaleString()}
          >
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </time>
        </div>
      </div>
    </div>
  );
}
