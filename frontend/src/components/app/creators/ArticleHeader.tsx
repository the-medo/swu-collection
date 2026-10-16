import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { creationTagMap } from '../../../../../shared/creators/taxonomy.ts';
import { creatorTitle } from './creatorStyles.ts';

export const articleSurface =
  'mx-auto w-full min-w-0 max-w-5xl rounded-[20px] border border-border bg-card';
export const articleInset = 'p-5 sm:p-8 lg:p-10';
export const articleBodyInset = 'p-2 sm:p-3 lg:p-4';
export const articleSummary =
  'm-0! text-[15px]! leading-[1.8]! whitespace-pre-wrap break-words text-muted-foreground';

/** Shared by the published article, private preview and inline editor. */
export function ArticleHeader({
  coverUrl,
  title,
  summary,
  tags,
  coverControl,
  children,
}: {
  coverUrl: string;
  title: ReactNode;
  summary?: ReactNode;
  tags: string[];
  coverControl?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        'relative isolate grid min-w-0 items-end overflow-hidden rounded-t-[19px] border-b border-border',
        articleInset,
        (coverUrl || coverControl) && 'min-h-80 pt-20 sm:pt-24 lg:pt-24',
      )}
    >
      {coverUrl && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <img
            src={coverUrl}
            referrerPolicy="no-referrer"
            alt=""
            className="h-full w-full object-cover opacity-40 dark:opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-card/20 via-card/70 to-card" />
        </div>
      )}
      {coverControl}
      <div className="pointer-events-none relative grid min-w-0 gap-4 [&>*]:pointer-events-auto">
        {typeof title === 'string' ? <h1 className={creatorTitle}>{title}</h1> : title}
        {typeof summary === 'string'
          ? summary && <p className={articleSummary}>{summary}</p>
          : summary}
        {children}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="whitespace-normal">
                {creationTagMap.get(tag)?.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
