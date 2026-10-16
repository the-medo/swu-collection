import { templateCards } from './templateCards.ts';
import { useMemo, useState } from 'react';
import { CalendarDays, Check, Search } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useTemplateMeta } from '@/api/creators/useTemplateMeta.ts';
import { useConnectionChoices } from '@/api/creators/useConnectionSubjects.ts';
import { useGetTournamentGroups } from '@/api/tournament-groups/useGetTournamentGroups.ts';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import { createMetaReport } from '../../../../../shared/posts/guidedTemplates.ts';
import type { TemplateMeta } from '../../../../../shared/types/ArticleTemplates.ts';
import {
  TemplateDialog,
  TemplateNotice,
  TemplatePreview,
  type TemplateDialogProps,
} from './templateControls.tsx';

function ReportOptions({
  meta,
  onApply,
}: {
  meta: TemplateMeta;
  onApply: TemplateDialogProps['onApply'];
}) {
  const catalog = useCardList();
  const [archetypes, setArchetypes] = useState(() =>
    meta.archetypes.slice(0, 5).map(item => item.key),
  );
  const [decks, setDecks] = useState(() =>
    meta.decklists.slice(0, 3).map(deck => `${deck.tournamentId}:${deck.id}`),
  );
  const cards = useMemo(
    () => (catalog.data ? templateCards(catalog.data.cards) : []),
    [catalog.data],
  );
  const template = useMemo(
    () => createMetaReport(meta, cards, archetypes, decks),
    [meta, cards, archetypes, decks],
  );
  if (catalog.isError)
    return (
      <TemplateNotice error retry={() => void catalog.refetch()}>
        Could not load card names and artwork.
      </TemplateNotice>
    );
  if (!catalog.data) return <TemplateNotice>Preparing card artwork…</TemplateNotice>;
  return (
    <>
      <TemplateNotice>
        {meta.events.length} events · {meta.deckCount} public tournament decks · As of {meta.asOf}.
        Charts refresh when the article opens; the generated figures record this selection.
      </TemplateNotice>
      <section className="space-y-3" aria-label="Archetypes to discuss">
        <strong className="text-sm">Archetypes to discuss</strong>
        <div className="max-h-64 space-y-2 overflow-y-auto p-1">
          {meta.archetypes.map(item => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"
            >
              <Checkbox
                checked={archetypes.includes(item.key)}
                disabled={!archetypes.includes(item.key) && archetypes.length >= 8}
                onCheckedChange={checked =>
                  setArchetypes(previous =>
                    checked ? [...previous, item.key] : previous.filter(key => key !== item.key),
                  )
                }
              />
              <DeckArtwork leaderId={item.leaderId} baseId={item.baseId} size="compact" />
              <span className="min-w-0 flex-1 text-xs">
                <strong className="block">
                  {catalog.data.cards[item.leaderId]?.name ?? item.leaderId}
                </strong>
                <span className="text-muted-foreground">
                  {catalog.data.cards[item.baseId]?.name ?? item.baseId}
                </span>
              </span>
              <span className="text-xs">{item.count} decks</span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3" aria-label="Featured decklists">
        <strong className="text-sm">Featured decklists</strong>
        <p className="text-xs text-muted-foreground">
          Choose up to five available lists. Placements belong to their individual events.
        </p>
        <div className="max-h-64 space-y-2 overflow-y-auto p-1">
          {meta.decklists.map(deck => (
            <label
              key={`${deck.tournamentId}:${deck.id}`}
              className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"
            >
              <Checkbox
                checked={decks.includes(`${deck.tournamentId}:${deck.id}`)}
                disabled={!decks.includes(`${deck.tournamentId}:${deck.id}`) && decks.length >= 5}
                onCheckedChange={checked =>
                  setDecks(previous =>
                    checked
                      ? [...previous, `${deck.tournamentId}:${deck.id}`]
                      : previous.filter(key => key !== `${deck.tournamentId}:${deck.id}`),
                  )
                }
              />
              <DeckArtwork leaderId={deck.leaderId} baseId={deck.baseId} size="compact" />
              <span className="min-w-0 text-xs">
                <strong className="block">
                  {deck.name || catalog.data.cards[deck.leaderId ?? '']?.name || 'Tournament deck'}
                </strong>
                <span className="text-muted-foreground">
                  #{deck.placement} · {deck.tournamentName}
                </span>
              </span>
            </label>
          ))}
        </div>
        {!meta.decklists.length && (
          <p className="text-sm text-muted-foreground">
            No public decklists with recorded placements are available. The report can still include
            the field and archetypes.
          </p>
        )}
      </section>
      <TemplatePreview template={template} onApply={onApply} />
    </>
  );
}
function MetaDetails({
  scope,
  id,
  onApply,
}: {
  scope: 'group' | 'tournament';
  id: string;
  onApply: TemplateDialogProps['onApply'];
}) {
  const meta = useTemplateMeta({ scope, id });
  if (meta.isError)
    return (
      <TemplateNotice error retry={() => void meta.refetch()}>
        Could not prepare this meta report.
      </TemplateNotice>
    );
  if (!meta.data) return <TemplateNotice>Preparing tournament data…</TemplateNotice>;
  if (!meta.data.deckCount)
    return (
      <TemplateNotice>
        No imported public deck data is available for this selection yet. Choose another source or
        start with a blank template.
      </TemplateNotice>
    );
  return <ReportOptions meta={meta.data} onApply={onApply} />;
}
export function MetaReportTemplateDialog(props: TemplateDialogProps) {
  const [scope, setScope] = useState<'group' | 'tournament'>('group');
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState('');
  const groups = useGetTournamentGroups({
    visible: true,
    sort: 'created_at',
    order: 'desc',
    enabled: scope === 'group',
  });
  const events = useConnectionChoices('tournament', search, scope === 'tournament');
  const query = scope === 'group' ? groups : events;
  const choices =
    scope === 'group'
      ? (groups.data?.pages
          .flatMap(page => page.data)
          .filter(row => row.group.name.toLowerCase().includes(search.toLowerCase()))
          .map(row => ({
            id: row.group.id,
            name: row.group.name,
            dates: [
              ...new Set(row.tournaments.map(item => String(item.tournament.date).slice(0, 10))),
            ]
              .sort()
              .join(' · '),
          })) ?? [])
      : (events.data?.pages
          .flat()
          .map(event => ({ id: event.id, name: event.label, dates: event.date ?? '' })) ?? []);
  return (
    <TemplateDialog
      {...props}
      title="Meta report"
      description="Choose a tournament or tournament group. We’ll prepare the field, featured decklists, and the archetypes you want to discuss."
    >
      <Tabs
        value={scope}
        onValueChange={value => {
          setScope(value as typeof scope);
          setSelected(undefined);
          setSearch('');
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="group">Tournament groups</TabsTrigger>
          <TabsTrigger value="tournament">Tournaments</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        icon={Search}
        aria-label="Find meta source"
        placeholder={scope === 'group' ? 'Filter loaded groups…' : 'Find a tournament…'}
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain p-1">
        {query.isPending || (scope === 'tournament' && events.typing) ? (
          <TemplateNotice>Loading sources…</TemplateNotice>
        ) : query.isError ? (
          <TemplateNotice error retry={() => void query.refetch()}>
            Could not load sources.
          </TemplateNotice>
        ) : (
          <>
            {choices.map(choice => (
              <button
                type="button"
                key={choice.id}
                aria-pressed={selected === choice.id}
                onClick={() => setSelected(choice.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-4 text-left hover:bg-muted/40',
                  selected === choice.id && 'border-primary bg-primary/5',
                )}
              >
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{choice.name}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {choice.dates || 'No events in this group yet'}
                  </span>
                </span>
                {selected === choice.id && <Check className="size-4 shrink-0" />}
              </button>
            ))}
            {!choices.length && (
              <p className="p-3 text-sm text-muted-foreground">No matching sources loaded.</p>
            )}
            {query.hasNextPage && (
              <Button
                className="w-full"
                variant="ghost"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Load more sources'}
              </Button>
            )}
          </>
        )}
      </div>
      {selected && (
        <MetaDetails
          key={`${scope}:${selected}`}
          scope={scope}
          id={selected}
          onApply={props.onApply}
        />
      )}
    </TemplateDialog>
  );
}
