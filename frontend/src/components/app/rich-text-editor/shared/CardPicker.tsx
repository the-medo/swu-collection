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
import { ArrowUpRight, ImageOff, Search } from 'lucide-react';
import { PickerNotice } from './PickerLayout.tsx';

export function CardPicker({ onSelect }: { onSelect: (card: CardReference) => void }) {
  const [search, setSearch] = useState('');
  const catalog = useCardList();
  const results = useMemo(
    () =>
      searchForCommandOptions(catalog.data, search, { rankByRelevance: true }).filter(
        result => catalog.data?.cards[result.cardId],
      ),
    [catalog.data, search],
  );
  return (
    <Command shouldFilter={false} className="rte-picker-command rounded-xl border shadow-sm">
      <CommandInput
        aria-label="Search cards"
        placeholder="Search by card name…"
        value={search}
        onValueChange={setSearch}
        autoFocus
      />
      {catalog.isPending ? (
        <PickerNotice title="Loading cards…" loading />
      ) : catalog.isError ? (
        <PickerNotice title="Could not load the card catalog." error>
          <Button className="mt-2" variant="outline" onClick={() => void catalog.refetch()}>
            Try again
          </Button>
        </PickerNotice>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>{search.trim() ? 'Matching cards' : 'Card catalog'}</span>
            <span>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </span>
          </div>
          <CommandList className="max-h-[min(360px,45dvh)] p-2">
            <CommandEmpty>
              <PickerNotice title={search.trim() ? 'No cards found' : 'Find a card'} icon={Search}>
                {search.trim()
                  ? 'Try another name or part of its title.'
                  : 'Search by name to find the card you want to share.'}
              </PickerNotice>
            </CommandEmpty>
            {results.map(result => {
              const card = catalog.data?.cards[result.cardId];
              if (!card) return null;
              const image = getCardImageUrl(card.variants[result.defaultVariant]?.image.front);
              return (
                <CommandItem
                  key={result.cardId}
                  value={result.cardId}
                  className="gap-3 p-2.5"
                  onSelect={() =>
                    onSelect({
                      cardId: result.cardId,
                      variantId: result.defaultVariant,
                      name: card.name,
                    })
                  }
                >
                  <span className="grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40 p-1">
                    {image ? (
                      <img
                        className="max-h-full max-w-full rounded-sm object-contain"
                        src={image}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{card.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {card.type} · {card.aspects?.join(' / ')}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="rte-picker-arrow shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </CommandItem>
              );
            })}
          </CommandList>
        </>
      )}
    </Command>
  );
}
