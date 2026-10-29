import { cn } from '@/lib/utils.ts';
import { useCreatorReturnTo } from './useCreatorReturnTo.ts';
import { CreationDate } from './CreationDate.tsx';
import { CreationPublisher } from './CreationPublisher.tsx';
import { LanguageFlag } from './CreatorLanguages.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, BookOpen, Headphones, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { creationTagMap } from '../../../../../shared/creators/taxonomy.ts';
import type { CreationSummary, EntityReference } from '../../../../../shared/creators/contracts.ts';
import {
  creatorDescription,
  creatorHeading,
  creatorLink,
  creatorSubheading,
  creatorTheme,
} from './creatorStyles.ts';

function videoDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isSafeInteger(seconds) || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`;
}

export function CompactCreationCard({ item }: { item: CreationSummary }) {
  const returnTo = useCreatorReturnTo();
  const doc = item.document;
  const publisher = item.creator?.name ?? item.author?.name ?? 'Deleted user';
  const Icon =
    doc.medium === 'article'
      ? BookOpen
      : doc.medium === 'video'
        ? Play
        : doc.medium === 'audio'
          ? Headphones
          : ArrowUpRight;
  const duration = doc.medium === 'video' ? videoDuration(doc.durationSeconds) : null;
  return (
    <article className="group h-24 w-72 shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-[var(--creator-border)] sm:w-80">
      <Link
        to="/content/$creationId"
        params={{ creationId: item.id }}
        search={{ returnTo }}
        aria-label={`${doc.title} by ${publisher}`}
        className="flex h-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="relative flex w-24 shrink-0 items-center justify-center overflow-hidden bg-[var(--creator-soft)] sm:w-28">
          {doc.coverUrl ? (
            <img
              src={doc.coverUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon
              className="size-7 text-[var(--creator-accent)]"
              strokeWidth={1.4}
              aria-hidden="true"
            />
          )}
          {duration && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1 text-[10px] tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 py-2">
          <h3 className="m-0! line-clamp-2 border-0! p-0! text-[13px]! font-semibold! leading-snug! tracking-[-0.015em]! group-hover:text-[var(--creator-accent)]">
            {doc.title}
          </h3>
          <span className="truncate text-[11px] text-muted-foreground">{publisher}</span>
        </div>
      </Link>
    </article>
  );
}

export function CreationCards({
  items,
  compactMobile = false,
}: {
  items: CreationSummary[];
  compactMobile?: boolean;
}) {
  const returnTo = useCreatorReturnTo();
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map(item => {
        const doc = item.document;
        const duration = doc.medium === 'video' ? videoDuration(doc.durationSeconds) : null;
        const Icon =
          doc.medium === 'article'
            ? BookOpen
            : doc.medium === 'video'
              ? Play
              : doc.medium === 'audio'
                ? Headphones
                : ArrowUpRight;
        return (
          <article
            key={item.id}
            className={cn(
              'group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card transition-colors hover:border-[var(--creator-border)]',
              compactMobile && 'grid grid-cols-[88px_minmax(0,1fr)] sm:flex',
            )}
          >
            <Link
              to="/content/$creationId"
              params={{ creationId: item.id }}
              search={{ returnTo }}
              className={cn(
                'relative flex aspect-video items-center justify-center overflow-hidden bg-[var(--creator-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                compactMobile && 'aspect-auto sm:aspect-video',
              )}
              aria-label={doc.title}
            >
              {doc.coverUrl ? (
                <img
                  src={doc.coverUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    'flex size-20 items-center justify-center rounded-2xl border border-[var(--creator-border)] bg-card/60',
                    compactMobile && 'size-12 sm:size-20',
                  )}
                >
                  <Icon className="size-8 text-[var(--creator-accent)]" strokeWidth={1.3} />
                </div>
              )}
              <Badge
                className={cn(
                  'absolute bottom-3 left-3 gap-1.5 border-white/20 bg-[#17352e] px-2.5 py-1 text-[10px] font-medium capitalize text-[#fffaf0] hover:bg-[#17352e]',
                  compactMobile && 'hidden sm:inline-flex',
                )}
              >
                <Icon size={12} />
                {doc.medium}
                {duration && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{duration}</span>
                  </>
                )}
              </Badge>
            </Link>
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col gap-3 p-5',
                compactMobile && 'gap-2 p-3 sm:gap-3 sm:p-5',
              )}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <CreationPublisher creation={item} avatar compact />
                <span className="shrink-0">
                  <LanguageFlag code={doc.language} />
                </span>
              </div>
              <h3
                className={cn(
                  creatorSubheading,
                  compactMobile &&
                    'order-first line-clamp-3 text-[15px]! sm:order-none sm:text-[17px]!',
                )}
              >
                <Link
                  to="/content/$creationId"
                  params={{ creationId: item.id }}
                  search={{ returnTo }}
                  className="rounded-sm hover:text-[var(--creator-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {doc.title}
                </Link>
              </h3>
              {doc.summary && (
                <p
                  className={cn(
                    creatorDescription,
                    'line-clamp-3',
                    compactMobile && 'hidden sm:line-clamp-3',
                  )}
                >
                  {doc.summary}
                </p>
              )}
              <footer
                className={cn(
                  'mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2',
                  compactMobile && 'flex flex-wrap items-center justify-between sm:grid',
                )}
              >
                {compactMobile && (
                  <span className="text-[10px] capitalize text-muted-foreground sm:hidden">
                    {doc.medium}
                    {duration && ` · ${duration}`}
                    {doc.freshness === 'historical' && ' · Historical'}
                    {doc.pinned && ' · Pinned'}
                  </span>
                )}
                <div
                  className={cn('flex min-w-0 flex-wrap gap-1', compactMobile && 'hidden sm:flex')}
                >
                  {doc.tags.slice(0, 3).map(id => (
                    <Badge key={id} variant="secondary">
                      {creationTagMap.get(id)?.label ?? id}
                    </Badge>
                  ))}
                  {doc.pinned && <Badge variant="outline">Pinned</Badge>}
                  {item.sourceVerified && <Badge variant="outline">Channel import</Badge>}
                  {doc.medium !== 'article' && !item.sourceVerified && (
                    <Badge variant="outline">Shared resource</Badge>
                  )}
                  {doc.freshness === 'historical' && <Badge variant="outline">Historical</Badge>}
                </div>
                <span className="whitespace-nowrap text-right text-[10px] leading-5 text-muted-foreground">
                  <CreationDate
                    publishedAt={item.publishedAt}
                    uploaded={doc.medium === 'video' && item.sourceVerified}
                  />
                </span>
              </footer>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function RelatedCreations({ type, id }: { type: EntityReference['type']; id: string }) {
  const query = useHubQuery(
    creatorKeys.discovery({ entityType: type, entityId: id, limit: 3 }),
    () => hubApi.discover({ entityType: type, entityId: id, limit: 3 }),
  );
  if (query.isPending) return null;
  if (query.isError) return null;
  if (!query.data?.items.length) return null;
  return (
    <section className={`${creatorTheme} my-6 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={creatorHeading}>From the community</h2>
        <Link
          to="/content"
          search={{ entityType: type, entityId: id }}
          className={`${creatorLink} inline-flex items-center gap-2`}
        >
          Explore content
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <CreationCards items={query.data.items.slice(0, 3)} />
    </section>
  );
}
