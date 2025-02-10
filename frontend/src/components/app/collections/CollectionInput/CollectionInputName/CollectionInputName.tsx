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
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  useCollectionInputNameStore,
  useCollectionInputNameStoreActions,
} from '@/components/app/collections/CollectionInput/CollectionInputName/useCollectionInputNameStore.tsx';
import { Button } from '@/components/ui/button.tsx';
import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import AmountInput from '@/components/app/collections/CollectionInput/components/AmountInput.tsx';
import FoilSwitch from '@/components/app/collections/CollectionInput/components/FoilSwitch.tsx';
import { cn } from '@/lib/utils.ts';
import CardLanguageSelect from '@/components/app/global/CardLanguageSelect.tsx';
import CardConditionSelect from '@/components/app/global/CardConditionSelect.tsx';
import NoteInput from '@/components/app/collections/CollectionInput/components/NoteInput.tsx';
import InsertingDefaults from '@/components/app/collections/CollectionInput/CollectionInputName/InsertingDefaults.tsx';
import { useCallback, useRef } from 'react';
import { usePostCollectionCard } from '@/api/usePostCollectionCard.ts';
import { cardConditionArray } from '../../../../../../../types/iterableEnumInfo.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';

// https://github.com/pacocoursey/cmdk/discussions/221#discussioncomment-11247291

interface CollectionInputNameProps {
  collectionId: string | undefined;
}

const CollectionInputName: React.FC<CollectionInputNameProps> = ({ collectionId }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const mutation = usePostCollectionCard(collectionId);

  const {
    open,
    search,
    selectedVariantId,
    selectedCardId,
    options,
    variantOptions,
    isFetching,
    cardList,
    defaultAmount,
    card: { card, variant, isSelectedVariant },
    amount,
    note,
    foil,
    language,
    condition,
  } = useCollectionInputNameStore();

  const {
    setOpen,
    setSearch,
    setSelectedVariantId,
    setSelectedCardId,
    setLanguage,
    setCondition,
    setAmount,
    setNote,
    setFoil,
    resetStateWithDefaults,
  } = useCollectionInputNameStoreActions();

  const submitHandler = useCallback(async () => {
    try {
      if (selectedCardId && selectedVariantId) {
        await mutation.mutateAsync({
          cardId: selectedCardId,
          variantId: selectedVariantId,
          foil,
          condition: cardConditionArray.find(c => c.condition === condition)?.numericValue ?? 1,
          language,
          amount,
          note,
        });
        resetStateWithDefaults();
        searchInputRef.current?.focus();
      }
      // Optionally clear the form or show a success message.
    } catch (error) {
      // Handle errors here.
      console.error(error);
    }
  }, [selectedCardId, selectedVariantId, foil, condition, language, amount, note]);

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
        <InsertingDefaults />
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
                    setOpen(true);
                  }}
                  onFocus={() => {
                    setOpen(true);
                  }}
                  ref={searchInputRef}
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
                  options?.map(i => {
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
                        <div className="flex flex-col gap-2 w-full">
                          <span className="font-medium">{card?.name}</span>
                          <div className="flex gap-2 w-full justify-between">
                            <span>{card?.type}</span>
                            <div className="flex gap-2">
                              {card?.cost !== null ? (
                                <CostIcon cost={card?.cost ?? 0} size="medium" />
                              ) : null}
                              {card?.aspects.map((a, i) => (
                                <AspectIcon key={`${a}${i}`} aspect={a} size="medium" />
                              ))}
                              {card?.rarity ? (
                                <RarityIcon rarity={card.rarity} size="small" />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                {selectedCardId &&
                  variantOptions?.map(vo => {
                    return (
                      <CommandItem
                        key={vo.variantId}
                        onSelect={() => {
                          setSelectedVariantId(vo.variantId);
                          setOpen(false);
                          if (defaultAmount) {
                            addButtonRef.current?.focus();
                          } else {
                            amountInputRef.current?.focus();
                          }
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
          {variant && (
            <div className="flex gap-2 justify-between">
              <div>
                <span>Version:</span> <span className="font-bold">{variant?.variantName}</span>
              </div>
              <div>
                <span>Set:</span> <span className="font-bold">{variant?.set.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>

        <div className={cn('flex gap-4')}>
          <div className="h-[279px] w-[200px] min-h-[279px] min-w-[200px] flex items-center justify-center">
            <CardImage card={card} cardVariantId={variant?.variantId} foil={foil} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <CardLanguageSelect
                value={language}
                onChange={setLanguage}
                showFullName={false}
                emptyOption={false}
              />
              <CardConditionSelect
                value={condition}
                onChange={setCondition}
                showFullName={false}
                emptyOption={false}
              />
            </div>
            <FoilSwitch value={foil} onChange={setFoil} />
            <NoteInput value={note} onChange={setNote} />
            <AmountInput value={amount} onChange={setAmount} ref={amountInputRef} />
          </div>
        </div>

        <Button
          className="w-full focus:border-2 focus:border-black"
          ref={addButtonRef}
          disabled={mutation.isPending}
          onClick={submitHandler}
        >
          {mutation.isPending ? '...' : 'Add to collection'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CollectionInputName;
