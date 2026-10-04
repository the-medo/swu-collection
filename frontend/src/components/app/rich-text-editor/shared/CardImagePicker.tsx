import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { CardPicker } from './CardPicker.tsx';
import { CardArtwork } from './Embeds.tsx';
import { CardSizeSelect } from './CardSizeSelect.tsx';
import type { Insertion, CardSize } from './model.ts';

type CardImage = Extract<Insertion, { kind: 'card-image' }>;

export function CardImagePicker({
  initial,
  onSelect,
}: {
  initial?: CardImage;
  onSelect: (value: CardImage) => void;
}) {
  const [size, setSize] = useState<CardSize>(initial?.size ?? 'medium');
  const [card, setCard] = useState(initial?.card);
  const [searching, setSearching] = useState(!initial);
  return (
    <div className="space-y-4">
      <CardSizeSelect value={size} onChange={setSize} />
      {searching ? (
        <CardPicker
          onSelect={card => {
            if (!initial) onSelect({ kind: 'card-image', card, size });
            else {
              setCard(card);
              setSearching(false);
            }
          }}
        />
      ) : (
        card && (
          <>
            <CardArtwork card={card} size={size} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSearching(true)}>
                Change card
              </Button>
              <Button onClick={() => onSelect({ kind: 'card-image', card, size })}>
                Save widget
              </Button>
            </div>
          </>
        )
      )}
    </div>
  );
}
