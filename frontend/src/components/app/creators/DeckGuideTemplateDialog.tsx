import { templateCards } from './templateCards.ts';
import { useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useEditorDeck } from '@/api/rich-text-editor/useEditorDecks.ts';
import { useTemplateMeta } from '@/api/creators/useTemplateMeta.ts';
import { Button } from '@/components/ui/button.tsx';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { createDeckGuide } from '../../../../../shared/posts/guidedTemplates.ts';
import {
  TemplateDialog,
  TemplateDeckChooser,
  TemplateNotice,
  TemplatePreview,
  type TemplateDialogProps,
} from './templateControls.tsx';

function GuideDetails({ id, onApply }: { id: string; onApply: TemplateDialogProps['onApply'] }) {
  const deck = useEditorDeck(id);
  const catalog = useCardList();
  const twoLeaders = (deck.data?.leaderIds.length ?? 0) > 1;
  const meta = useTemplateMeta(
    deck.data && !twoLeaders ? { scope: 'current', format: deck.data.format } : undefined,
  );
  const [skipMeta, setSkipMeta] = useState(false);
  const cards = useMemo(
    () => (catalog.data ? templateCards(catalog.data.cards) : []),
    [catalog.data],
  );
  const template = useMemo(
    () =>
      deck.data && catalog.data
        ? createDeckGuide(deck.data, cards, skipMeta ? undefined : meta.data)
        : undefined,
    [deck.data, catalog.data, cards, meta.data, skipMeta],
  );
  if (deck.isError || catalog.isError)
    return (
      <TemplateNotice
        error
        retry={() => {
          void deck.refetch();
          void catalog.refetch();
        }}
      >
        Could not load the deck and its cards.
      </TemplateNotice>
    );
  if (!template || !deck.data || deck.isFetching)
    return <TemplateNotice>Preparing your deck guide…</TemplateNotice>;
  if (deck.data.visibility !== 1)
    return (
      <TemplateNotice>
        This deck is no longer public. Choose a public deck so readers can see the guide’s decklist.
      </TemplateNotice>
    );
  if (meta.isPending && !skipMeta && !twoLeaders)
    return <TemplateNotice>Finding the top five decks in the current meta…</TemplateNotice>;
  if (meta.isError && !skipMeta && !twoLeaders)
    return (
      <TemplateNotice error retry={() => void meta.refetch()}>
        Could not load current meta data.{' '}
        <Button variant="ghost" onClick={() => setSkipMeta(true)}>
          Continue without meta matchups
        </Button>
      </TemplateNotice>
    );
  return (
    <>
      <section
        className="space-y-3 rounded-xl border bg-primary/5 p-4"
        aria-label="Current meta matchups"
      >
        <strong className="block text-sm">Current meta matchups</strong>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {meta.data?.archetypes.length && !skipMeta
            ? `${meta.data.source.name} · PQ and higher · ${meta.data.deckCount} public tournament decks · As of ${meta.data.asOf}`
            : 'No current meta data included.'}
        </p>
        {(!meta.data?.archetypes.length || skipMeta || twoLeaders) && (
          <p className="text-sm">
            {twoLeaders
              ? 'Automatic matchups currently support one leader per deck. Your guide will include space to write your two-leader matchup plans.'
              : 'No matchups available for this format yet. Your guide will include a place to add them.'}
          </p>
        )}
        {!skipMeta &&
          meta.data?.archetypes.slice(0, 5).map(item => (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <DeckArtwork size="compact" leaderId={item.leaderId} baseId={item.baseId} />
              <span className="min-w-0 flex-1 text-xs">
                <strong className="block">
                  {catalog.data?.cards[item.leaderId]?.name ?? item.leaderId}
                </strong>
                <span className="text-muted-foreground">
                  {catalog.data?.cards[item.baseId]?.name ?? item.baseId}
                </span>
              </span>
              <span className="text-xs">{item.count} decks</span>
            </div>
          ))}
      </section>
      <TemplatePreview template={template} onApply={onApply} />
    </>
  );
}
export function DeckGuideTemplateDialog(props: TemplateDialogProps) {
  const [selected, setSelected] = useState<string>();
  return (
    <TemplateDialog
      {...props}
      title="Deck guide"
      description="Choose your deck. We’ll prepare its card groups, individual card notes, and five current-meta matchup plans."
    >
      <TemplateDeckChooser selected={selected} onSelect={setSelected} />
      {selected && <GuideDetails key={selected} id={selected} onApply={props.onApply} />}
    </TemplateDialog>
  );
}
