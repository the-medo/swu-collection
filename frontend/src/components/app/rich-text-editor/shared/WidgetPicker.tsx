import { useState, useId } from 'react';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useEditorMeta } from '@/api/rich-text-editor/useEditorMeta.ts';
import { CardPicker } from './CardPicker.tsx';
import { CardArtwork } from './Embeds.tsx';
import { CardSizeSelect } from './CardSizeSelect.tsx';
import { MetaEmbed } from './MetaEmbed.tsx';
import { widgetSchema, type CardReference, type CardSize, type Widget } from './model.ts';

export function WidgetPicker({
  kind,
  initial,
  onSelect,
}: {
  kind: Widget['kind'];
  initial?: Widget;
  onSelect: (value: Widget) => void;
}) {
  const fieldId = useId();
  const [text, setText] = useState(initial && 'text' in initial ? initial.text : '');
  const [title, setTitle] = useState(
    initial && 'title' in initial
      ? initial.title
      : kind === 'matchup'
        ? 'Matchup plan'
        : 'Game plan',
  );
  const [tone, setTone] = useState<'tip' | 'warning' | 'key-play'>(
    initial?.kind === 'callout' ? initial.tone : 'tip',
  );
  const [scope, setScope] = useState<'tournament' | 'group'>(
    initial?.kind === 'meta-analysis' ? initial.scope : 'tournament',
  );
  const [id, setId] = useState(initial?.kind === 'meta-analysis' ? initial.id : '');
  const [loaded, setLoaded] = useState(initial?.kind === 'meta-analysis' ? initial : undefined);
  const [subtitle, setSubtitle] = useState(initial?.kind === 'matchup' ? initial.subtitle : '');
  const [cards, setCards] = useState<CardReference[]>(
    initial?.kind === 'card-group' ? initial.cards : [],
  );
  const [size, setSize] = useState<CardSize>(
    initial?.kind === 'card-group' ? initial.size : 'medium',
  );
  const [addingCard, setAddingCard] = useState(false);
  const [matchup, setMatchup] = useState<
    Pick<
      Extract<Widget, { kind: 'matchup' }>,
      'leftLeader' | 'leftBase' | 'rightLeader' | 'rightBase'
    >
  >(
    initial?.kind === 'matchup'
      ? initial
      : { leftLeader: '', leftBase: undefined, rightLeader: '', rightBase: undefined },
  );
  const [error, setError] = useState('');
  const catalog = useCardList();
  const meta = useEditorMeta(loaded ?? { scope, id: '' });
  const candidate =
    kind === 'meta-analysis'
      ? loaded
      : kind === 'matchup'
        ? { ...matchup, kind, title, subtitle, text }
        : kind === 'card-group'
          ? { kind, cards, size, text }
          : { kind, tone, title, text };
  const parsed = widgetSchema.safeParse(candidate);
  const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm';
  return (
    <div className="space-y-4">
      {kind === 'meta-analysis' && (
        <>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
            <div className="grid gap-1 text-sm">
              <label htmlFor={`${fieldId}-scope`}>Scope</label>
              <select
                id={`${fieldId}-scope`}
                className={selectClass}
                value={scope}
                onChange={e => {
                  setScope(e.target.value as typeof scope);
                  setLoaded(undefined);
                }}
              >
                <option value="tournament">Tournament</option>
                <option value="group">Tournament group</option>
              </select>
            </div>
            <div className="grid gap-1 text-sm">
              <label htmlFor={`${fieldId}-id`}>Tournament or group ID</label>
              <Input
                id={`${fieldId}-id`}
                value={id}
                onChange={e => {
                  setId(e.target.value);
                  setLoaded(undefined);
                }}
                placeholder="Paste its UUID"
                autoFocus
              />
            </div>
            <Button
              className="self-end"
              onClick={() => {
                const result = widgetSchema.safeParse({
                  kind,
                  scope,
                  id: id.trim(),
                  settings:
                    loaded?.settings ?? (initial?.kind === 'meta-analysis' ? initial.settings : {}),
                });
                if (!result.success || result.data.kind !== 'meta-analysis') {
                  setError('Enter a valid tournament or tournament-group UUID.');
                  return;
                }
                setError('');
                setLoaded(result.data);
              }}
            >
              Load preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy the ID from a tournament or group URL. The chart stays live; filters are saved with
            this widget.
          </p>
          {loaded && <MetaEmbed value={loaded} onChange={setLoaded} />}
        </>
      )}
      {kind === 'matchup' && (
        <div className="grid grid-cols-2 gap-4">
          {(['left', 'right'] as const).map(side => (
            <fieldset key={side} className="space-y-2 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">
                {side === 'left' ? 'Your deck' : 'Opponent'}
              </legend>
              <LeaderSelector
                leaderCardId={matchup[`${side}Leader`] || undefined}
                onLeaderSelected={value =>
                  setMatchup(prev => ({ ...prev, [`${side}Leader`]: value ?? '' }))
                }
                trigger={
                  <Button
                    variant="outline"
                    className="h-auto min-h-9 w-full whitespace-normal"
                    aria-label={`${side} leader`}
                  >
                    {catalog.data?.cards[matchup[`${side}Leader`]]?.name ?? 'Choose leader'}
                  </Button>
                }
              />
              <BaseSelector
                baseCardId={matchup[`${side}Base`] || undefined}
                onBaseSelected={value => setMatchup(prev => ({ ...prev, [`${side}Base`]: value }))}
                trigger={
                  <Button
                    variant="outline"
                    className="h-auto min-h-9 w-full whitespace-normal"
                    aria-label={`${side} base`}
                  >
                    {catalog.data?.cards[matchup[`${side}Base`] ?? '']?.name ??
                      'Choose base (optional)'}
                  </Button>
                }
              />
              {matchup[`${side}Base`] && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${side} base`}
                  onClick={() => setMatchup(prev => ({ ...prev, [`${side}Base`]: undefined }))}
                >
                  Remove {side} base
                </Button>
              )}
            </fieldset>
          ))}
        </div>
      )}
      {kind === 'card-group' && (
        <>
          <CardSizeSelect value={size} onChange={setSize} />
          <div className="flex flex-wrap items-start gap-3">
            {cards.map((card, index) => (
              <div key={`${card.cardId}-${index}`} className="min-w-0 max-w-full">
                <CardArtwork card={card} size={size} />
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Remove ${card.name}`}
                  onClick={() => setCards(prev => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={cards.length >= 30}
            onClick={() => setAddingCard(!addingCard)}
          >
            {addingCard ? 'Cancel card search' : 'Add card'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {cards.length} / 30 cards. Cards appear in the order you add them.
          </p>
          {addingCard && (
            <CardPicker
              onSelect={card => {
                setCards(prev => [...prev, card]);
                setAddingCard(false);
              }}
            />
          )}
        </>
      )}
      {kind === 'matchup' && (
        <div className="grid gap-3">
          <div className="grid gap-1 text-sm">
            <label htmlFor={`${fieldId}-title`}>Title</label>
            <Input
              id={`${fieldId}-title`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1 text-sm">
            <label htmlFor={`${fieldId}-subtitle`}>Subtitle</label>
            <Input
              id={`${fieldId}-subtitle`}
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              maxLength={240}
            />
          </div>
        </div>
      )}
      {kind === 'callout' && (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="grid gap-1 text-sm">
            <label htmlFor={`${fieldId}-tone`}>Style</label>
            <select
              id={`${fieldId}-tone`}
              className={selectClass}
              value={tone}
              onChange={e => setTone(e.target.value as typeof tone)}
            >
              <option value="tip">Tip</option>
              <option value="warning">Watch out</option>
              <option value="key-play">Key play</option>
            </select>
          </div>
          <div className="grid gap-1 text-sm">
            <label htmlFor={`${fieldId}-title`}>Title</label>
            <Input
              id={`${fieldId}-title`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
        </div>
      )}
      {kind !== 'meta-analysis' && (
        <div className="grid gap-1 text-sm">
          <label htmlFor={`${fieldId}-notes`}>
            {kind === 'matchup' ? 'Matchup notes' : 'Notes'}
          </label>
          <Textarea
            id={`${fieldId}-notes`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Explain your plan…"
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!parsed.success && kind !== 'meta-analysis' && (
        <p className="text-sm text-muted-foreground">
          {kind === 'matchup'
            ? 'Choose a leader for each side and add matchup notes. Bases are optional.'
            : kind === 'card-group'
              ? 'Add at least one card to continue. Notes are optional.'
              : 'Add a title and notes to continue.'}
        </p>
      )}
      <Button
        disabled={!parsed.success || (kind === 'meta-analysis' && (meta.isPending || meta.isError))}
        onClick={() => {
          if (parsed.success) onSelect(parsed.data);
        }}
      >
        {initial ? 'Save widget' : 'Insert widget'}
      </Button>
    </div>
  );
}
