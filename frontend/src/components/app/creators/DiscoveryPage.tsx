import { useId, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, BookOpen, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { CreationCards } from './CreationCards.tsx';
import { Field, selectClass, Status, TagPicker } from './CreatorControls.tsx';
import { DiscoverySubjects } from './DiscoverySubjects.tsx';
import { LanguageFilter } from './CreatorLanguages.tsx';
import { normalizeTagIds } from '../../../../../shared/creators/taxonomy.ts';
import { CreatorHeader, CreatorLayout } from './CreatorLayout.tsx';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorLink,
  creatorPagination,
  creatorPanel,
} from './creatorStyles.ts';
import { type DiscoveryQuery } from '../../../../../shared/creators/contracts.ts';
export default function DiscoveryPage({
  search,
  onChange,
}: {
  search: DiscoveryQuery;
  onChange: (patch: Partial<DiscoveryQuery>) => void;
}) {
  const searchInput = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const [filterReset, setFilterReset] = useState(0);
  const query = useHubQuery(
    creatorKeys.discovery(search),
    () => hubApi.discover(search),
    true,
    false,
    {
      keepPreviousData: true,
    },
  );
  const selected = normalizeTagIds(search.tags?.split(',').filter(Boolean) ?? []);
  const change = (patch: Partial<DiscoveryQuery>) => onChange({ ...patch, page: 1 });
  return (
    <CreatorLayout>
      <Helmet title="Discover SWU content | SWUBASE" />
      <CreatorHeader
        eyebrow="SWUBASE · Creator hub"
        title="Your next great game starts here."
        description="Explore guides, gameplay and ideas from the Star Wars Unlimited community. Find the right content for your deck, format and next step."
      >
        <Button asChild size="sm" className="rounded-lg">
          <Link to="/creators">
            Meet the creators <ArrowRight size={15} />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg border-white/25 bg-transparent text-[#fffaf0] hover:bg-white/10 hover:text-[#fffaf0]"
        >
          <Link to="/creator-studio">Creator studio</Link>
        </Button>
      </CreatorHeader>
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${creatorPanel} space-y-4`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={creatorHeading}>Find your focus</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (searchInput.current) searchInput.current.value = '';
                setFilterReset(value => value + 1);
                onChange({
                  q: undefined,
                  tags: undefined,
                  language: undefined,
                  freshness: undefined,
                  after: undefined,
                  before: undefined,
                  entityType: undefined,
                  entityId: undefined,
                  creatorId: undefined,
                  series: undefined,
                  page: 1,
                });
              }}
            >
              Clear
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen(open => !open)}
          >
            <SlidersHorizontal size={15} />
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </Button>
          <div id={filtersId} className={`space-y-4 ${filtersOpen ? '' : 'hidden lg:block'}`}>
            <DiscoverySubjects
              key={`${filterReset}-${search.entityType ?? 'set'}`}
              search={search}
              onChange={change}
              subject={query.data?.subject}
            />
            <TagPicker
              selected={selected}
              onChange={ids => change({ tags: ids.join(',') || undefined })}
              compact
            />
            <LanguageFilter
              available={query.data?.languages ?? []}
              value={search.language}
              onChange={language => change({ language })}
            />
            <Field label="Relevance over time">
              <select
                className={selectClass}
                value={search.freshness ?? ''}
                onChange={e =>
                  change({
                    freshness: (e.target.value as DiscoveryQuery['freshness']) || undefined,
                  })
                }
              >
                <option value="">Current and historical</option>
                <option value="current">Current</option>
                <option value="historical">Historical</option>
              </select>
            </Field>
            <Field label="Published since">
              <Input
                type="date"
                value={search.after ?? ''}
                onChange={e => change({ after: e.target.value || undefined })}
              />
            </Field>
            <Field label="Published through">
              <Input
                type="date"
                value={search.before ?? ''}
                onChange={e => change({ before: e.target.value || undefined })}
              />
            </Field>
          </div>
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Discover content">
          <form
            className="flex gap-2 rounded-[20px] border border-border bg-card p-3"
            onSubmit={e => {
              e.preventDefault();
              change({
                q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined,
              });
            }}
          >
            <Input
              aria-label="Search content"
              placeholder="Search titles and summaries…"
              name="q"
              ref={searchInput}
              key={search.q ?? ''}
              defaultValue={search.q ?? ''}
              className="min-w-0 rounded-lg"
            />
            <Button type="submit" aria-label="Search" className="rounded-lg">
              <Search size={18} />
            </Button>
          </form>
          {search.entityType && search.entityId && (
            <p className="text-sm text-muted-foreground">
              Showing content connected to{' '}
              {query.data?.subject?.id === search.entityId
                ? query.data.subject.label
                : `this ${search.entityType}`}
              .{' '}
              <button
                className={creatorLink}
                onClick={() => {
                  setFilterReset(value => value + 1);
                  change({ entityType: undefined, entityId: undefined });
                }}
              >
                Show all subjects
              </button>
            </p>
          )}
          <Status loading={query.isPending} error={query.error} />
          {query.data?.items.length === 0 && (
            <div className={`${creatorEmpty} grid justify-items-center gap-3`}>
              <BookOpen className="size-8 text-[var(--creator-accent)]" />
              <h2 className={`${creatorHeading} text-foreground`}>Room for a new perspective</h2>
              <p className={creatorDescription}>
                No publications match these filters yet. Try a broader search or share your own.
              </p>
            </div>
          )}
          {query.data && <CreationCards items={query.data.items} />}
          <div className={creatorPagination}>
            <Button
              variant="outline"
              disabled={search.page <= 1}
              onClick={() => onChange({ page: search.page - 1 })}
            >
              Previous
            </Button>
            <span className="text-[12px] text-muted-foreground">Page {search.page}</span>
            <Button
              variant="outline"
              disabled={!query.data?.hasMore}
              onClick={() => onChange({ page: search.page + 1 })}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </CreatorLayout>
  );
}
