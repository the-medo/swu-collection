import { useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { searchForCommandOptions } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { CardReference } from './model.ts';

export function CardPicker({ onSelect }: { onSelect: (card: CardReference) => void }) {
  const [search, setSearch] = useState('');
  const catalog = useCardList();
  const results = useMemo(
    () => searchForCommandOptions(catalog.data, search, { rankByRelevance: true }),
    [catalog.data, search],
  );
  return (
    <Command shouldFilter={false} className="border">
      <CommandInput
        aria-label="Search cards"
        placeholder="Search by card name…"
        value={search}
        onValueChange={setSearch}
        autoFocus
      />
      {catalog.isPending ? (
        <p role="status" className="p-4 text-sm">
          Loading cards…
        </p>
      ) : catalog.isError ? (
        <div role="alert" className="p-4">
          <p>Could not load the card catalog.</p>
          <Button onClick={() => void catalog.refetch()}>Try again</Button>
        </div>
      ) : (
        <CommandList className="max-h-[50vh]">
          <CommandEmpty>No cards found. Try another name.</CommandEmpty>
          {results.map(result => {
            const card = catalog.data?.cards[result.cardId];
            if (!card) return null;
            const image = getCardImageUrl(card.variants[result.defaultVariant]?.image.front);
            return (
              <CommandItem
                key={result.cardId}
                value={result.cardId}
                className="gap-3 p-3"
                onSelect={() =>
                  onSelect({
                    cardId: result.cardId,
                    variantId: result.defaultVariant,
                    name: card.name,
                  })
                }
              >
                {image && (
                  <img
                    className="h-16 w-12 shrink-0 object-contain"
                    src={image}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span>
                  <span className="block font-medium">{card.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {card.type} · {card.aspects?.join(' / ')}
                  </span>
                </span>
              </CommandItem>
            );
          })}
        </CommandList>
      )}
    </Command>
  );
}
