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
import { Switch } from '@/components/ui/switch.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useCollectionInputNameStore } from '@/components/app/collections/CollectionInput/CollectionInputName/useCollectionInputNameStore.tsx';

// https://github.com/pacocoursey/cmdk/discussions/221#discussioncomment-11247291

interface CollectionInputNameProps {
  collectionId: string | undefined;
}

const CollectionInputName: React.FC<CollectionInputNameProps> = ({ collectionId }) => {
  const {
    open,
    setOpen,
    search,
    setSearch,
    selectedVariantId,
    setSelectedVariantId,
    selectedCardId,
    setSelectedCardId,
    options,
    variantOptions,
    isFetching,
    cardList,
  } = useCollectionInputNameStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insert cards by name</CardTitle>
        <CardDescription className="flex flex-col gap-2">
          Search for a card, select version and insert it into the collection.
          <span className="text-xs">Collection id: {collectionId}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Inserting defaults</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-[auto,1fr] grid-rows-3 gap-4 p-4">
                <div className="col-span-2">
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select default version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">
                        <b>Standard</b> version by default
                      </SelectItem>
                      <SelectItem value="Hyperspace">
                        <b>Hyperspace</b> version by default
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Switch id="switch-1" />
                </div>
                <div className="flex flex-col justify-center">
                  <label htmlFor="switch-1" className="font-semibold">
                    Always foil
                  </label>
                  <span className="text-sm text-gray-500">
                    Card will be automatically marked as foil
                  </span>
                </div>
                <div>
                  <Input
                    id="amount-input"
                    name="amount-input"
                    placeholder=""
                    className="w-12 px-1 pl-2"
                    type="number"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <label htmlFor="amount-input" className="font-semibold">
                    Default amount
                  </label>
                  <span className="text-sm text-gray-500">Empty or 0 means no default</span>
                </div>
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
                        <img
                          src={
                            'https://images.swubase.com/cards/' +
                            card?.variants[i.defaultVariant]?.image.front
                          }
                          alt="card-img"
                          className="h-20"
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
                        <img
                          src={'https://images.swubase.com/cards/' + vo.image.front}
                          alt="card-img"
                          className="h-20"
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
      </CardContent>
    </Card>
  );
};

export default CollectionInputName;
