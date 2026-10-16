import { ExternalLink, Images, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import type { UserAlbumPage } from '../../../../../../types/UserAlbum.ts';
import { albumHref } from './model.ts';

/** Only API-authorized data is passed here; photo URLs never enter the article document. */
export function AlbumPreview({ data }: { data: UserAlbumPage }) {
  const { album, images, owner } = data;
  return (
    <section className={`${albumTheme} min-w-0 space-y-4`} aria-label="Album preview">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--album-border)] bg-[var(--album-tint)] text-[var(--album-accent)]">
          <Images className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--album-accent)]">
            Photo album
          </p>
          <p className="text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">
            {album.title}
          </p>
        </div>
        {album.visibility === 'private' && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            <LockKeyhole className="size-3" aria-hidden /> Only you
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-[var(--album-border)] bg-[var(--album-tint)] p-1.5 sm:gap-2 sm:p-2">
        {Array.from({ length: 4 }, (_, index) => {
          const image = images[index];
          return (
            <div
              key={index}
              className="relative aspect-square max-h-40 w-full min-w-0 overflow-hidden rounded-lg bg-background/60 sm:aspect-[4/3]"
            >
              {image ? (
                <img
                  src={image.thumbnailUrl}
                  alt={image.altText || image.caption || `${album.title}, photo ${index + 1}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-full place-items-center text-[var(--album-accent)]/30"
                >
                  <Images className="size-6" strokeWidth={1.2} />
                </span>
              )}
              {image && index === 3 && album.imageCount > 4 && (
                <span className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-semibold text-white sm:text-2xl">
                  <span aria-hidden>+{album.imageCount - 4}</span>
                  <span className="sr-only">{album.imageCount - 4} more photos</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {album.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {album.description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <p className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {album.imageCount === 0
            ? 'No photos yet'
            : `${album.imageCount} ${album.imageCount === 1 ? 'photo' : 'photos'}`}
          <span className="mx-2" aria-hidden>
            ·
          </span>
          {owner.displayName}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-lg text-foreground no-underline"
          asChild
        >
          <a
            href={albumHref(album.id)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open album: ${album.title} (new tab)`}
          >
            Open album <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      </div>
    </section>
  );
}
