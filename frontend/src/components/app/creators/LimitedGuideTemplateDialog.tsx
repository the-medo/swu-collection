import { templateCards } from './templateCards.ts';
import { useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useEditorDeck } from '@/api/rich-text-editor/useEditorDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { setInfo } from '../../../../../lib/swu-resources/set-info.ts';
import { createLimitedGuide } from '../../../../../shared/posts/guidedTemplates.ts';
import { selectClass } from './CreatorControls.tsx';
import {
  TemplateDialog,
  TemplateCardChoices,
  TemplateDeckChooser,
  TemplateNotice,
  TemplatePreview,
  type TemplateDialogProps,
} from './templateControls.tsx';

function LimitedDetails({
  set,
  format,
  onApply,
}: {
  set: string;
  format: 'Draft' | 'Sealed';
  onApply: TemplateDialogProps['onApply'];
}) {
  const catalog = useCardList();
  const [leaders, setLeaders] = useState<string[]>([]);
  const [picks, setPicks] = useState<string[]>([]);
  const [showDecks, setShowDecks] = useState(false);
  const [deckId, setDeckId] = useState<string>();
  const deck = useEditorDeck(deckId);
  const formatId = format === 'Sealed' ? 3 : 4;
  const cards = useMemo(
    () => (catalog.data ? templateCards(catalog.data.cards, set) : []),
    [catalog.data, set],
  );
  const template = useMemo(
    () =>
      createLimitedGuide({
        set,
        setName: Object.values(setInfo).find(item => item.code === set)?.name ?? set,
        format,
        cards,
        leaderIds: leaders,
        keyCardIds: picks,
        exampleDeck:
          deck.data?.visibility === 1 && deck.data.format === formatId ? deck.data : undefined,
      }),
    [set, format, formatId, cards, leaders, picks, deck.data],
  );
  if (catalog.isError)
    return (
      <TemplateNotice error retry={() => void catalog.refetch()}>
        Could not load the card catalog.
      </TemplateNotice>
    );
  if (!catalog.data) return <TemplateNotice>Loading set cards…</TemplateNotice>;
  if (!cards.length)
    return <TemplateNotice>No cards are available for this set yet.</TemplateNotice>;
  return (
    <>
      <TemplateCardChoices
        label="Leaders to discuss"
        cards={cards.filter(card => card.type === 'Leader')}
        catalog={catalog.data.cards}
        selected={leaders}
        onChange={setLeaders}
        limit={8}
      />
      <TemplateCardChoices
        label="Cards to prioritise"
        cards={cards.filter(card => !['Leader', 'Base'].includes(card.type))}
        catalog={catalog.data.cards}
        selected={picks}
        onChange={setPicks}
        limit={30}
      />
      <div className="space-y-3 rounded-xl border p-4">
        <Button variant="outline" onClick={() => setShowDecks(value => !value)}>
          {showDecks ? 'Hide deck choices' : 'Add an example deck'}
        </Button>
        {deckId && (
          <Button variant="ghost" onClick={() => setDeckId(undefined)}>
            Remove example deck
          </Button>
        )}
        {showDecks && (
          <TemplateDeckChooser limitedFormat={format} selected={deckId} onSelect={setDeckId} />
        )}
        {deckId &&
          (deck.isError ? (
            <TemplateNotice error retry={() => void deck.refetch()}>
              Could not load the example deck.
            </TemplateNotice>
          ) : deck.isFetching ? (
            <TemplateNotice>Loading example deck…</TemplateNotice>
          ) : (
            <p className="text-sm">{deck.data?.name}</p>
          ))}
      </div>
      {(!deckId ||
        (deck.data?.visibility === 1 &&
          deck.data.format === formatId &&
          !deck.isFetching &&
          !deck.isError)) && <TemplatePreview template={template} onApply={onApply} />}
      {deck.data && deck.data.visibility !== 1 && (
        <TemplateNotice>Choose a public example deck so readers can see it.</TemplateNotice>
      )}
      {deck.data && deck.data.format !== formatId && (
        <TemplateNotice>Choose a {format.toLowerCase()} deck for this guide.</TemplateNotice>
      )}
    </>
  );
}
export function LimitedGuideTemplateDialog(props: TemplateDialogProps) {
  const [set, setSet] = useState('');
  const [format, setFormat] = useState<'Draft' | 'Sealed'>('Draft');
  return (
    <TemplateDialog
      {...props}
      title="Limited guide"
      description="Choose a set and format, then pick the leaders and cards you want to explain. Add one of your limited decks as an example."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <strong className="block">Set</strong>
          <select
            aria-label="Limited set"
            className={selectClass}
            value={set}
            onChange={event => setSet(event.target.value)}
          >
            <option value="">Choose a set…</option>
            {Object.values(setInfo)
              .sort((a, b) => b.sortValue - a.sortValue)
              .map(set => (
                <option key={set.code} value={set.code}>
                  {set.name}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <strong className="block">Format</strong>
          <select
            aria-label="Limited format"
            className={selectClass}
            value={format}
            onChange={event => setFormat(event.target.value as typeof format)}
          >
            <option>Draft</option>
            <option>Sealed</option>
          </select>
        </label>
      </div>
      {set && (
        <LimitedDetails
          key={`${set}:${format}`}
          set={set}
          format={format}
          onApply={props.onApply}
        />
      )}
    </TemplateDialog>
  );
}
