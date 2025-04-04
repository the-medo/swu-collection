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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

interface CardSearchCommandProps {
  /** used to determine open state and search string, since there can be multiple
    instances of CardSearchCommand on the same page (eg. homepage with expanded sidebar) */
  id: 'card-search-left-sidebar' | 'card-search-homepage';
}

const CardSearchCommand: React.FC<CardSearchCommandProps> = ({ id }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate({ from: Route.fullPath });

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
  }, [id, search]);

  return (
    <Popover open={open}>
      <Command className="border w-full" shouldFilter={false}>
        <PopoverTrigger>
          {isFetching ? (
            <Skeleton className={`h-11 w-full`} />
          ) : (
            <CommandInput
              placeholder="Search..."
              value={search}
              onValueChange={v => {
                setSearch(v);
              }}
              onKeyDown={e => setOpen(e.key !== 'Escape')}
              onMouseDown={() => {
                setOpen(true);
              }}
              ref={searchInputRef}
            />
          )}
        </PopoverTrigger>
        <PopoverContent
          className="md:w-[450px] ml-2 p-0"
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
            <CommandItem onSelect={onShowAllResults}>
              <div className="flex flex-col gap-2 p-4 w-full font-medium">
                {options?.length > 0
                  ? 'Show all results'
                  : 'No results found. Open advenced search.'}
              </div>
            </CommandItem>
            {options?.map(i => {
              const card = cardList?.cards[i.cardId];
              return (
                <CommandItem
                  key={i.cardId}
                  onSelect={() => {
                    setSearch('');
                    setOpen(false);
                    navigate({
                      search: prev => ({ ...prev, modalCardId: i.cardId }),
                    });
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
