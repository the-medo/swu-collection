import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandInput,
  CommandItem,
} from '@/components/ui/command.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  useCollectionInputNameStore,
  useCollectionInputNameStoreActions,
} from '@/components/app/collections/CollectionInput/CollectionInputName/useCollectionInputNameStore.tsx';
import { Button } from '@/components/ui/button.tsx';
import * as React from 'react';
import DefaultVariantNameSelect from '@/components/app/collections/CollectionInput/components/DefaultVariantNameSelect.tsx';
import DefaultFoilSwitch from '@/components/app/collections/CollectionInput/components/DefaultFoilSwitch.tsx';
import DefaultAmountInput from '@/components/app/collections/CollectionInput/components/DefaultAmountInput.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import AmountInput from '@/components/app/collections/CollectionInput/components/AmountInput.tsx';
import FoilSwitch from '@/components/app/collections/CollectionInput/components/FoilSwitch.tsx';
import { cn } from '@/lib/utils.ts';

// https://github.com/pacocoursey/cmdk/discussions/221#discussioncomment-11247291

interface CollectionInputNameProps {
  collectionId: string | undefined;
}

const CollectionInputName: React.FC<CollectionInputNameProps> = ({ collectionId }) => {
  const {
    open,
    search,
    selectedVariantId,
    selectedCardId,
    options,
    variantOptions,
    isFetching,
    cardList,
    card: { card, variant, isSelectedVariant },
    defaultVariantName,
    defaultFoil,
    defaultAmount,
    amount,
    foil,
  } = useCollectionInputNameStore();

  const {
    setOpen,
    setSearch,
    setSelectedVariantId,
    setSelectedCardId,
    setDefaultVariantName,
    setDefaultFoil,
    setDefaultAmount,
    setAmount,
    setFoil,
  } = useCollectionInputNameStoreActions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insert cards by name</CardTitle>
        <CardDescription className="flex flex-col gap-2">
          Search for a card, select version and insert it into the collection.
          <span className="text-xs">
            Collection id: {collectionId} {isSelectedVariant}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Inserting defaults</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-[auto,1fr,auto] grid-rows-3 gap-4 p-4">
                <DefaultVariantNameSelect
                  value={defaultVariantName}
                  onChange={setDefaultVariantName}
                />
                <DefaultFoilSwitch value={defaultFoil} onChange={setDefaultFoil} />
                <DefaultAmountInput value={defaultAmount} onChange={setDefaultAmount} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Popover open={open}>
          <Command className="border w-[350px]" shouldFilter={false}>
            <PopoverTrigger asChild>
              {isFetching ? (
                <Skeleton className={`h-11 w-[350px]`} />
              ) : (
                <CommandInput
                  placeholder="Card name..."
                  value={search}
                  onValueChange={v => {
                    setSearch(v);
                    setSelectedCardId(undefined);
                    setSelectedVariantId(undefined);
                  }}
                  onKeyDown={e => setOpen(e.key !== 'Escape')}
                  onMouseDown={() => {
                    // setSearch('');
                    setOpen(true);
                  }}
                  onFocus={() => {
                    // setSearch('');
                    setOpen(true);
                  }}
                />
              )}
            </PopoverTrigger>
            <PopoverContent
              className="w-[350px] -ml-6 p-0"
              onOpenAutoFocus={e => e.preventDefault()}
              onInteractOutside={e => {
                if (e.target instanceof Element && e.target.hasAttribute('cmdk-input')) {
                  e.preventDefault();
                } else {
                  setOpen(false);
                }
              }}
            >
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {!selectedCardId &&
                  options.map(i => {
                    const card = cardList?.cards[i.cardId];
                    return (
                      <CommandItem
                        key={i.cardId}
                        onSelect={() => {
                          setSelectedCardId(i.cardId);
                          setSearch(card?.name ?? '');
                          // setOpen(false);
                        }}
                      >
                        <CardImage
                          size="w75"
                          card={card}
                          cardVariantId={i.defaultVariant}
                          canDisplayBackSide={false}
                        />
                        <span>{card?.name}</span>
                      </CommandItem>
                    );
                  })}
                {selectedCardId &&
                  variantOptions.map(vo => {
                    return (
                      <CommandItem
                        key={vo.variantId}
                        onSelect={() => {
                          setSelectedVariantId(vo.variantId);
                          setOpen(false);
                        }}
                      >
                        <CardImage
                          size="w75"
                          card={card}
                          cardVariantId={vo.variantId}
                          canDisplayBackSide={false}
                        />
                        <span>{vo.variantName}</span>
                      </CommandItem>
                    );
                  })}
              </CommandList>
            </PopoverContent>
          </Command>
        </Popover>
        <div className="flex flex-col gap-2">
          <span>{selectedCardId}</span>
          <span>{selectedVariantId}</span>
        </div>

        <div className={cn('flex gap-4')}>
          <div className="h-[279px] w-[200px] min-h-[279px] min-w-[200px] flex items-center justify-center">
            <CardImage
              card={card}
              cardVariantId={variant?.variantId}
              size={card?.front?.horizontal ? 'w100' : 'w200'}
              foil={foil}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FoilSwitch value={foil} onChange={setFoil} />
            <AmountInput value={amount} onChange={setAmount} />
          </div>
        </div>

        <Button className="w-full">Add to collection</Button>
      </CardContent>
    </Card>
  );
};

export default CollectionInputName;
