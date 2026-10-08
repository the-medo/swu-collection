import * as React from 'react';
import { useCallback, useRef } from 'react';
import {
  useCardSearchCommandStore,
  useCardSearchCommandStoreActions,
} from '@/components/app/global/CardSearchCommand/useCardSearchCommandStore.tsx';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import { useNavigate } from '@tanstack/react-router';
import { getCardDetailDialogSearch } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';

interface CardSearchCommandProps {
  /** used to determine open state and search string, since there can be multiple
    instances of CardSearchCommand on the same page (eg. homepage with expanded sidebar) */
  id: string;
  onSelectCard?: (cardId: string, variantId: string) => void;
  disabled?: boolean;
  label?: string;
}

const CardSearchCommand: React.FC<CardSearchCommandProps> = ({
  id,
  onSelectCard,
  disabled = false,
  label = 'Search cards',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { isMobile, setOpenMobile } = useSidebar();
  const { open, search, options, isFetching, cardList } = useCardSearchCommandStore(id);

  const { setOpen, setSearch } = useCardSearchCommandStoreActions(id);

  const onShowAllResults = useCallback(() => {
    setSearch('');
    setOpen(false);
    void navigate({
      to: '/cards/search',
      search: prev => ({ ...prev, name: search }),
    });
    if (isMobile && id === 'card-search-left-sidebar') setOpenMobile(false);
  }, [id, search, navigate, isMobile, setOpenMobile, setSearch, setOpen]);

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <Command id={id} label={label} className="border w-full" shouldFilter={false}>
        <PopoverAnchor asChild>
          <div>
            {isFetching ? (
              <Skeleton className={`h-11 w-full`} />
            ) : (
              <CommandInput
                placeholder="Search..."
                disabled={disabled}
                value={search}
                onValueChange={v => {
                  setSearch(v);
                  setOpen(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
                  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setOpen(true);
                }}
                onPointerDown={() => {
                  setOpen(true);
                }}
                ref={searchInputRef}
              />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[min(450px,calc(100vw-2rem))] p-0"
          align="start"
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          onInteractOutside={e => {
            if (e.target === searchInputRef.current) {
              e.preventDefault();
            } else {
              setOpen(false);
            }
          }}
        >
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {!onSelectCard && (
              <CommandItem onSelect={onShowAllResults}>
                <div className="flex flex-col gap-2 p-4 w-full font-medium">
                  {options?.length > 0
                    ? 'Show all results'
                    : 'No results found. Open advanced search.'}
                </div>
              </CommandItem>
            )}
            {options?.map(i => {
              const card = cardList?.cards[i.cardId];
              return (
                <CommandItem
                  key={i.cardId}
                  value={i.cardId}
                  onSelect={() => {
                    setSearch('');
                    setOpen(false);
                    if (onSelectCard) {
                      onSelectCard(i.cardId, i.defaultVariant);
                      return;
                    }
                    void navigate({
                      to: '.',
                      search: previous => getCardDetailDialogSearch(previous, i.cardId),
                    });
                  }}
                >
                  <CardImage
                    size="w75"
                    card={card}
                    cardVariantId={i.defaultVariant}
                    backSideButton={false}
                  />
                  <div className="flex min-w-0 flex-col gap-2 w-full">
                    <span className="font-medium">{card?.name}</span>
                    <div className="flex flex-wrap gap-2 w-full justify-between">
                      <span>{card?.type}</span>
                      <div className="flex gap-2">
                        {card?.cost !== null ? (
                          <CostIcon cost={card?.cost ?? 0} size="medium" />
                        ) : null}
                        {card?.aspects?.map((a, i) => (
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
  );
};

export default CardSearchCommand;
