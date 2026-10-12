import { useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { useId } from 'react';
import { UserX } from 'lucide-react';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar.tsx';
import type { RecentDiscussion } from '../../../../../shared/types/discussions.ts';

export function ForumCommentItem({ entry }: { entry: RecentDiscussion }) {
  const navigate = useNavigate();
  const previewId = useId();
  return (
    <div className="relative flex min-w-0 items-start gap-2.5 rounded-lg py-3">
      {entry.author ? (
        <UserDisplay
          user={entry.author}
          size="md"
          showName={false}
          className="relative z-3 shrink-0"
        />
      ) : (
        <Avatar
          role="img"
          aria-label="Deleted user"
          title="Deleted user"
          className="relative z-3 m-0.5 size-8 border border-border/60"
        >
          <AvatarFallback className="bg-muted text-muted-foreground">
            <UserX size={16} aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <a
            href={entry.targetUrl}
            aria-describedby={previewId}
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
            className="min-w-0 truncate text-xs font-medium text-[color:var(--forum-accent)] after:absolute after:inset-0 after:z-2 after:rounded-lg after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-[var(--forum-accent)] focus-visible:after:outline-offset-2"
          >
            {entry.targetName || 'Thread'}
          </a>
          <time
            className="relative z-3 shrink-0 text-[10px] text-muted-foreground"
            dateTime={entry.createdAt}
            title={new Date(entry.createdAt).toLocaleString()}
          >
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </time>
        </div>
        <p
          id={previewId}
          className="mb-0! mt-1! line-clamp-2 break-words text-xs! leading-relaxed! text-foreground"
        >
          {entry.preview || 'Join the conversation'}
        </p>
      </div>
    </div>
  );
}
