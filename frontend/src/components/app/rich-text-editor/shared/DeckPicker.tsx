import { useState } from 'react';
import { CheckCircle2, Layers3 } from 'lucide-react';
import { useEditorDeck } from '@/api/rich-text-editor/useEditorDecks.ts';
import { DeckPicker as SharedDeckPicker } from '@/components/app/global/DeckPicker/DeckPicker.tsx';
import { Button } from '@/components/ui/button.tsx';
import { PickerBody, PickerFooter, PickerNotice } from './PickerLayout.tsx';
import type { DeckReference } from './model.ts';

export function DeckPicker({ onSelect }: { onSelect: (deck: DeckReference) => void }) {
  const [selected, setSelected] = useState<string>();
  const liveDeck = useEditorDeck(selected);
  return (
    <>
      <PickerBody className="space-y-3">
        <SharedDeckPicker selected={selected} onSelect={setSelected} />
        {selected && (
          <section
            data-deck-preview
            className="rounded-xl border border-primary/25 bg-primary/5 p-4"
          >
            {liveDeck.isPending || liveDeck.isFetching ? (
              <PickerNotice title="Loading decklist…" loading />
            ) : liveDeck.isError ? (
              <PickerNotice title="This deck is unavailable" error>
                <p>It may have been removed, or you may not have access to it.</p>
                <Button className="mt-3" variant="outline" onClick={() => void liveDeck.refetch()}>
                  Try again
                </Button>
              </PickerNotice>
            ) : (
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selected deck
                  </p>
                  <strong className="block break-words text-sm">{liveDeck.data.name}</strong>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {(['Main deck', 'Sideboard', 'Maybeboard'] as const).map((label, index) => (
                      <span key={label} className="rounded-md border bg-background/70 px-2 py-1">
                        {label} (
                        {liveDeck.data.cards.reduce(
                          (count, card) => count + (card.board === index + 1 ? card.quantity : 0),
                          0,
                        )}
                        )
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </PickerBody>
      <PickerFooter hint="Readers will see the latest decklist when they open your article.">
        <Button
          disabled={!liveDeck.data || liveDeck.isPending || liveDeck.isFetching || liveDeck.isError}
          onClick={() => liveDeck.data && onSelect({ deckId: liveDeck.data.deckId })}
        >
          <Layers3 className="size-4" aria-hidden />
          Insert decklist
        </Button>
      </PickerFooter>
    </>
  );
}
