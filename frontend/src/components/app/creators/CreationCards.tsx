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
export function CreationCards({ items }: { items: CreationSummary[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map(item => {
        const doc = item.document;
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
            className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card transition-colors hover:border-[var(--creator-border)]"
          >
            <Link
              to="/content/$creationId"
              params={{ creationId: item.id }}
              className="relative flex aspect-video items-center justify-center overflow-hidden bg-[var(--creator-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
                <div className="flex size-20 items-center justify-center rounded-2xl border border-[var(--creator-border)] bg-card/60">
                  <Icon className="size-8 text-[var(--creator-accent)]" strokeWidth={1.3} />
                </div>
              )}
              <Badge className="absolute bottom-3 left-3 gap-1.5 border-white/20 bg-[#17352e] px-2.5 py-1 text-[10px] font-medium capitalize text-[#fffaf0] hover:bg-[#17352e]">
                <Icon size={12} />
                {doc.medium}
              </Badge>
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <Link
                  to="/creators/$slug"
                  params={{ slug: item.creator.slug }}
                  className={`${creatorLink} truncate`}
                >
                  {item.creator.name}
                </Link>
                <span>
                  <LanguageFlag code={doc.language} />
                </span>
              </div>
              <h3 className={creatorSubheading}>
                <Link
                  to="/content/$creationId"
                  params={{ creationId: item.id }}
                  className="rounded-sm hover:text-[var(--creator-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {doc.title}
                </Link>
              </h3>
              {doc.summary && <p className={`${creatorDescription} line-clamp-3`}>{doc.summary}</p>}
              <div className="mt-auto flex flex-wrap gap-1">
                {doc.tags.slice(0, 3).map(id => (
                  <Badge key={id} variant="secondary">
                    {creationTagMap.get(id)?.label ?? id}
                  </Badge>
                ))}
                {item.sourceVerified && <Badge variant="outline">Channel import</Badge>}
                {doc.medium !== 'article' && !item.sourceVerified && (
                  <Badge variant="outline">Shared resource</Badge>
                )}
                {doc.freshness === 'historical' && <Badge variant="outline">Historical</Badge>}
              </div>
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
