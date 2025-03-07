import { useCallback, useRef } from 'react';
import { usePostDeckCard } from '@/api/decks/usePostDeckCard.ts';
import {
  useDeckInputCommandStore,
  useDeckInputCommandStoreActions,
} from '@/components/app/decks/DeckContents/DeckInputCommand/useDeckInputCommandStore.tsx';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';
import BoardSelect from '@/components/app/global/BoardSelect/BoardSelect.tsx';

interface DeckInputCommandProps {
  deckId: string;
}

const DeckInputCommand: React.FC<DeckInputCommandProps> = ({ deckId }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const mutation = usePostDeckCard(deckId);

  const { open, search, options, isFetching, cardList, amount, board } = useDeckInputCommandStore();

  const { setOpen, setSearch, setAmount, setBoard } = useDeckInputCommandStoreActions();

  const submitHandler = useCallback(
    async (cardId: string) => {
      try {
        if (amount !== 0) {
          await mutation.mutateAsync({
            board,
            cardId,
            quantity: amount ?? 0,
          });
          searchInputRef.current?.focus();
        }
        // Optionally clear the form or show a success message.
      } catch (error) {
        // Handle errors here.
        console.error(error);
      }
    },
    [board, amount],
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="w-20">
        <Input
          ref={amountInputRef}
          id="amount-input"
          name="amount-input"
          placeholder=""
          className="h-11"
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value) || undefined)}
        />
      </div>
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
              {options?.map(i => {
                const card = cardList?.cards[i.cardId];
                return (
                  <CommandItem
                    key={i.cardId}
                    onSelect={() => {
                      setSearch('');
                      setOpen(false);
                      submitHandler(i.cardId);
                    }}
                  >
                    <CardImage
                      size="w75"
                      card={card}
                      cardVariantId={i.defaultVariant}
                      backSideButton={false}
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
                          {card?.rarity ? <RarityIcon rarity={card.rarity} size="small" /> : null}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandList>
          </PopoverContent>
        </Command>
      </Popover>
      <BoardSelect value={board} onChange={setBoard} />
    </div>
  );
};

export default DeckInputCommand;
