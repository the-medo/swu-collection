import { useState, useId } from 'react';
import { Check, Plus, GalleryHorizontalEnd, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea.tsx';
import { CardPicker } from './CardPicker.tsx';
import { CardArtwork } from './Embeds.tsx';
import { CardSizeSelect } from './CardSizeSelect.tsx';
import type { CardReference, CardSize } from './model.ts';
import { PickerBody, PickerFooter, PickerNotice } from './PickerLayout.tsx';
import { Button } from '@/components/ui/button.tsx';
import { widgetSchema, type Widget } from './model.ts';

export function CardGroupPicker({
  initial,
  onSelect,
}: {
  initial?: Extract<Widget, { kind: 'card-group' }>;
  onSelect: (value: Widget) => void;
}) {
  const kind = 'card-group';
  const fieldId = useId();
  const [cards, setCards] = useState<CardReference[]>(initial?.cards ?? []);
  const [size, setSize] = useState<CardSize>(initial?.size ?? 'medium');
  const [text, setText] = useState(initial?.text ?? '');
  const [addingCard, setAddingCard] = useState(false);
  const parsed = widgetSchema.safeParse({ kind, cards, size, text });

  const guidance = !parsed.success
    ? 'Add at least one card to continue. Notes are optional.'
    : initial
      ? 'Changes apply to this block when you save.'
      : 'You can edit this block again after inserting it.';
  return (
    <>
      <PickerBody>
        <CardSizeSelect value={size} onChange={setSize} />
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">Selected cards</p>
            <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
              {cards.length} / 30
            </span>
          </div>
          {cards.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {cards.map((card, index) => (
                <div
                  key={`${card.cardId}-${index}`}
                  className="rte-picker-card relative min-w-0 rounded-xl border bg-background p-2 text-xs"
                >
                  <CardArtwork card={card} size="small" />
                  <Button
                    variant="secondary"
                    size="iconSmall"
                    className="absolute right-1 top-1 rounded-full shadow-sm"
                    aria-label={`Remove ${card.name}`}
                    onClick={() => setCards(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="size-3" />
                  </Button>
                  <span className="block text-center text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <PickerNotice title="Which cards tell your story?" icon={GalleryHorizontalEnd}>
              Add cards to compare choices, show a combo, or highlight your picks.
            </PickerNotice>
          )}
          <Button
            variant="outline"
            className="w-full border-dashed"
            disabled={cards.length >= 30}
            onClick={() => setAddingCard(!addingCard)}
          >
            {addingCard ? <X aria-hidden /> : <Plus aria-hidden />}
            {addingCard ? 'Cancel card search' : 'Add card'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Cards appear in the order you add them. The size above applies in your article.
          </p>
        </div>
        {addingCard && (
          <CardPicker
            onSelect={card => {
              setCards(prev => [...prev, card]);
              setAddingCard(false);
            }}
          />
        )}

        <div className="grid gap-2 text-xs font-medium">
          <label htmlFor={`${fieldId}-notes`}>Notes</label>
          <Textarea
            id={`${fieldId}-notes`}
            className="min-h-28 resize-y rounded-xl text-sm leading-relaxed"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="What connects these cards? (optional)"
          />
        </div>
      </PickerBody>
      <PickerFooter hint={guidance}>
        <Button
          disabled={!parsed.success}
          onClick={() => {
            if (parsed.success) onSelect(parsed.data);
          }}
        >
          {initial ? <Check aria-hidden /> : <Plus aria-hidden />}
          {initial ? 'Save changes' : 'Insert card group'}
        </Button>
      </PickerFooter>
    </>
  );
}
