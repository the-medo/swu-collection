import { cn } from '@/lib/utils.ts';
import { ExternalLink, Play } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type {
  LiveTournamentWeekendTournamentEntry,
  TournamentWeekendResource,
} from '../liveTournamentTypes.ts';
import { YouTubeEmbed } from './YouTubeEmbed.tsx';

export function TournamentWeekendStreamCard({
  resource,
  tournament,
  footerAction,
  showWatchLink = true,
  compact = false,
}: {
  resource: TournamentWeekendResource;
  tournament?: LiveTournamentWeekendTournamentEntry;
  footerAction?: ReactNode;
  showWatchLink?: boolean;
  compact?: boolean;
}) {
  const title = tournament?.tournament.name || resource.title || 'Tournament stream';
  const embedTitle = resource.title || `${title} stream`;
  const status = tournament?.weekendTournament.status;
  return (
    <article
      className={cn(
        'live-stream-card overflow-hidden rounded-[12px] border border-border bg-background/50',
        '[&_>_div:first-child:has(iframe)]:border-0 [&_>_div:first-child:has(iframe)]:rounded-none',
        compact &&
          'live-stream-compact [&_.live-stream-copy]:py-[11px] [&_.live-stream-copy]:px-[13px] [&_h4]:text-[12px]! [&_h4]:mb-2!',
      )}
    >
      {!compact && <YouTubeEmbed url={resource.resourceUrl} title={embedTitle} />}
      <div className="live-stream-copy p-[13px]">
        <span
          className={cn(
            'live-stream-status inline-flex gap-[5px] items-center text-muted-foreground text-[9px]',
            'data-[status=running]:text-[#27804b]',
            'dark:data-[status=running]:text-[#a7d6b1]',
            "[&[data-status=running]::before]:content-[''] [&[data-status=running]::before]:h-[5px]",
            '[&[data-status=running]::before]:w-[5px] [&[data-status=running]::before]:rounded-full',
            '[&[data-status=running]::before]:bg-current',
          )}
          data-status={status}
        >
          {status === 'running' ? 'At the tables' : status === 'finished' ? 'Replay' : 'Stream'}
        </span>
        <h4 className="mx-0! mt-1.5! mb-3! text-[13px]! font-medium! leading-[1.5]! wrap-anywhere">
          {title}
        </h4>
        <div
          className={cn(
            'live-stream-actions flex items-center flex-wrap gap-3',
            '[&_a]:inline-flex [&_a]:gap-[5px] [&_a]:items-center [&_a]:text-[10px] [&_a]:text-muted-foreground',
            '[&_a:hover]:underline',
            '[&_.live-stream-watch]:text-foreground [&_.live-stream-watch]:font-medium',
          )}
        >
          {showWatchLink && (
            <Link
              to="/"
              search={previous => ({ ...previous, homeMode: 'live', streamId: resource.id })}
              className="live-stream-watch"
            >
              <Play size={12} fill="currentColor" /> Watch here
            </Link>
          )}
          <a
            href={resource.resourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${title} on YouTube`}
          >
            YouTube <ExternalLink size={12} />
          </a>
        </div>
        {footerAction && <div className="mt-3">{footerAction}</div>}
      </div>
    </article>
  );
}
