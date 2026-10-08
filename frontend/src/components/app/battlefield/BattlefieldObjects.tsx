import { useRef, useState } from 'react';
import { Coins, Minus, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  battlefieldCatalog,
  battlefieldCategories,
  battlefieldShipBatchLimit,
  canBatchBattlefieldItem,
  type BattlefieldItem,
} from '../../../../../shared/battlefield/catalog.ts';
import { BattlefieldThumbnail } from './BattlefieldThumbnail';

function ItemPreview({ item }: { item: BattlefieldItem }) {
  return (
    <div className="flex h-16 items-center justify-center overflow-hidden rounded bg-[#0c1723]">
      {item.kind === 'object' ? (
        <BattlefieldThumbnail item={item} />
      ) : item.kind === 'background' ? (
        <div
          className="h-full w-full"
          style={{
            background: `radial-gradient(ellipse at 75% 130%, ${item.shades?.[2]}, ${item.shades?.[1]} 30%, ${item.shades?.[0]} 80%)`,
          }}
        />
      ) : (
        <div
          className="size-10 rounded-full"
          style={{ background: item.color ?? 'linear-gradient(135deg,#d5ab6b,#59a5cb)' }}
        />
      )}
    </div>
  );
}

export function BattlefieldObjects({
  onChoose,
  canApply,
  onClose,
  cost,
  budget,
}: {
  onChoose: (item: BattlefieldItem, quantity: number) => boolean;
  canApply: (item: BattlefieldItem) => boolean;
  onClose: () => void;
  cost?: number;
  budget?: number;
}) {
  const [open, setOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const items = battlefieldCatalog.filter(
    item =>
      (category === 'All' || item.category === category) &&
      (item.name + ' ' + item.description).toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="w-full">
          <Plus className="size-4" />
          Objects
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
        onOpenAutoFocus={event => {
          event.preventDefault();
          searchInput.current?.focus();
        }}
        className="flex max-h-[min(440px,var(--radix-popover-content-available-height))] w-[min(720px,calc(100vw-32px))] flex-col gap-3 p-3"
        aria-label="Battlefield objects"
        onCloseAutoFocus={event => {
          event.preventDefault();
          onClose();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm">Objects</strong>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close objects"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            ref={searchInput}
            aria-label="Search objects"
            placeholder="Find a planet, ship, color…"
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 gap-1 overflow-x-auto pb-1" aria-label="Object categories">
          {['All', ...battlefieldCategories].map(value => (
            <Button
              key={value}
              variant={category === value ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={category === value}
              className="shrink-0"
              onClick={() => setCategory(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        {category === 'Colors' && (
          <p className="text-xs text-muted-foreground">
            Select objects on the Battlefield to change their color.
          </p>
        )}
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map(item => {
              const quantity = quantities[item.id] ?? 1;
              const batch = canBatchBattlefieldItem(item);
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-lg border bg-card transition-colors hover:border-primary"
                >
                  <button
                    type="button"
                    aria-label={(item.kind === 'object' ? 'Add ' : 'Apply ') + item.name}
                    disabled={!canApply(item)}
                    title={canApply(item) ? item.description : 'Select an object first'}
                    className="flex flex-1 flex-col gap-2 rounded-lg p-2 text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50"
                    onClick={() => {
                      if (onChoose(item, quantity)) {
                        setOpen(false);
                        setSearch('');
                      }
                    }}
                  >
                    <ItemPreview item={item} />
                    <span className="text-xs font-medium">{item.name}</span>
                    <span className="mt-auto flex w-full items-center gap-1 text-xs tabular-nums text-muted-foreground">
                      <Coins className="size-3 shrink-0 text-amber-500" />
                      {(item.cost * quantity).toLocaleString()}
                      {batch && <span className="ml-auto text-foreground">Add {quantity}</span>}
                    </span>
                  </button>
                  {batch && (
                    <div
                      role="group"
                      aria-label={item.name + ' quantity'}
                      className="flex items-center justify-between gap-1 border-t px-1 py-0.5"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={'Decrease ' + item.name + ' quantity'}
                        disabled={quantity === 1}
                        onClick={() =>
                          setQuantities(previous => ({
                            ...previous,
                            [item.id]: Math.max(1, (previous[item.id] ?? 1) - 1),
                          }))
                        }
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <output aria-label={item.name + ' quantity'} className="text-xs tabular-nums">
                        {quantity}
                      </output>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={'Increase ' + item.name + ' quantity'}
                        disabled={quantity === battlefieldShipBatchLimit}
                        onClick={() =>
                          setQuantities(previous => ({
                            ...previous,
                            [item.id]: Math.min(
                              battlefieldShipBatchLimit,
                              (previous[item.id] ?? 1) + 1,
                            ),
                          }))
                        }
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!items.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No objects match your search.
            </p>
          )}
        </div>
        <div className="shrink-0 border-t pt-2">
          <p
            role="status"
            aria-label="Objects layout budget"
            className={
              cost !== undefined && budget !== undefined && cost > budget
                ? 'text-sm tabular-nums text-destructive'
                : 'text-sm tabular-nums'
            }
          >
            <strong>
              {cost === undefined ? 'Cost unavailable' : 'Cost ' + cost.toLocaleString()}
            </strong>{' '}
            {budget !== undefined && `/ ${budget.toLocaleString()} `}credits
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Objects and add-ons count per copy. Used colors count once per layout.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Small ship batches form a squadron layer, arranged side by side.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
