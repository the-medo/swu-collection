import { AlbumModerationAction } from '../user-albums/AlbumModerationAction.tsx';
import { useId } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Images } from 'lucide-react';
import type { TournamentAlbum } from '../../../../../types/UserAlbum.ts';
import { cn } from '@/lib/utils.ts';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

export function TournamentAlbumCard({
  album,
  compact = false,
  onSelect,
}: {
  album: TournamentAlbum;
  compact?: boolean;
  onSelect?: (button: HTMLButtonElement) => void;
}) {
  const countId = useId();
  const content = (
    <>
      <div
        className={cn('relative overflow-hidden bg-[#17352e]', compact ? 'h-16' : 'aspect-[16/9]')}
      >
        {album.cover ? (
          <img
            src={album.cover.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-[#dce7a0]/60">
            <Images className={compact ? 'size-6' : 'size-12'} strokeWidth={1.2} />
          </span>
        )}
        <span
          id={countId}
          className={cn(
            'absolute rounded-full bg-black/70 font-medium text-white',
            compact
              ? 'bottom-1.5 right-1.5 px-1.5 py-0.5 text-[11px]'
              : 'left-4 top-4 px-3 py-1.5 text-xs',
          )}
        >
          {album.imageCount} {album.imageCount === 1 ? 'photo' : 'photos'}
        </span>
      </div>
      <div
        className={cn(
          'flex items-start justify-between gap-3',
          compact ? 'px-2 pt-2' : 'px-5 pt-5 sm:px-6',
        )}
      >
        <h3
          className={cn(
            'm-0! min-w-0 border-0! p-0! font-semibold! tracking-tight! group-hover:text-[var(--album-accent)]',
            compact
              ? 'truncate text-xs! leading-4!'
              : 'line-clamp-2 text-xl! leading-snug! [overflow-wrap:anywhere]',
          )}
        >
          {album.title}
        </h3>
        {!compact && <ArrowUpRight className="mt-1 size-5 shrink-0 text-[var(--album-accent)]" />}
      </div>
    </>
  );
  return (
    <article
      className={cn(
        'group min-w-0 overflow-hidden border bg-card transition-shadow hover:shadow-md',
        compact ? 'rounded-lg' : 'flex flex-col rounded-[20px] shadow-sm',
      )}
    >
      {onSelect ? (
        <button
          type="button"
          data-event-album
          aria-label={`View album: ${album.title}`}
          aria-describedby={countId}
          title={album.title}
          onClick={event => onSelect(event.currentTarget)}
          className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {content}
        </button>
      ) : (
        <Link
          data-event-album
          to="/albums/$albumId"
          params={{ albumId: album.id }}
          aria-label={`View album: ${album.title}`}
          aria-describedby={countId}
          title={album.title}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {content}
        </Link>
      )}
      <div
        className={
          compact ? 'px-2 pb-2' : 'flex flex-1 flex-col gap-4 px-5 pb-5 pt-2 sm:px-6 sm:pb-6'
        }
      >
        <UserDisplay
          user={album.owner}
          className={cn(
            'self-start text-muted-foreground',
            compact && 'py-0 text-[11px] [&>span:last-child]:truncate',
          )}
        />
        {!compact && album.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {album.description}
          </p>
        )}
        {!compact && <AlbumModerationAction album={album} block />}
      </div>
    </article>
  );
}
