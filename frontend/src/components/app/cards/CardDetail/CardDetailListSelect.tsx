import { useRef, useState } from 'react';
import { Check, ChevronsUpDown, Heart, Layers, List } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.tsx';
import { cn } from '@/lib/utils.ts';
import type { Collection } from '../../../../../../types/Collection.ts';
import { CollectionType } from '../../../../../../types/enums.ts';

const listGroups = [
  { type: CollectionType.COLLECTION, title: 'Collections', Icon: Layers },
  { type: CollectionType.WANTLIST, title: 'Wantlists', Icon: Heart },
  { type: CollectionType.OTHER, title: 'Card lists', Icon: List },
];

export default function CardDetailListSelect({
  id,
  collections,
  value,
  onChange,
  disabled,
}: {
  id: string;
  collections: Collection[];
  value: string | undefined;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>();
  const selectedCollection = collections.find(collection => collection.id === value);

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={next => {
        if (next) {
          // Keep wheel and touch events inside an enclosing dialog's scroll-lock boundary.
          setPortalContainer(trigger.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined);
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open && !disabled}
          disabled={disabled}
          className="h-10 w-full min-w-0 justify-between gap-2 px-3 font-normal"
        >
          <span className="truncate">{selectedCollection?.title ?? 'Select a list...'}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-60 max-w-[calc(100vw-2rem)] p-0"
      >
        <Command
          label="Search lists"
          filter={(_value, search, keywords) =>
            keywords?.some(keyword => keyword.toLowerCase().includes(search.trim().toLowerCase()))
              ? 1
              : 0
          }
        >
          <CommandInput placeholder="Search lists..." className="min-w-0" />
          <CommandList aria-label="Destination lists" className="max-h-80 p-1">
            <CommandEmpty>No lists found.</CommandEmpty>
            {listGroups.map(({ type, title, Icon }) => {
              const options = collections.filter(collection => collection.collectionType === type);
              if (!options.length) return null;
              return (
                <CommandGroup
                  key={type}
                  className="mb-2 rounded-md border p-0 last:mb-0 [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:bg-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
                  heading={
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {title}
                      </span>
                      <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-normal tabular-nums text-muted-foreground">
                        {options.length}
                      </span>
                    </span>
                  }
                >
                  {options.map(collection => (
                    <CommandItem
                      key={collection.id}
                      value={collection.id}
                      keywords={[collection.title, title]}
                      className={cn(
                        'm-1 py-2',
                        value === collection.id && 'bg-primary/10 font-medium',
                      )}
                      onSelect={() => {
                        onChange(collection.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn('h-4 w-4 shrink-0', value !== collection.id && 'opacity-0')}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">{collection.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
