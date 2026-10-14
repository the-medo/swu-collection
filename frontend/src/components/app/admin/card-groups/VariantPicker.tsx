import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { indexCardPrintings } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import { containsAllWords } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';

export default function VariantPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const catalog = useCardList();
  const [search, setSearch] = useState('');
  const [bulk, setBulk] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [limit, setLimit] = useState(24);
  const index = useMemo(() => indexCardPrintings(catalog.data?.cards ?? {}), [catalog.data]);
  const matches = useMemo(
    () =>
      search.trim().length < 2
        ? []
        : [...index.values()].filter(({ card, variant }) =>
            containsAllWords(
              `${card.name} ${variant.variantId} ${variant.variantName} ${variant.set} ${variant.cardNo}`,
              search,
            ),
          ),
    [index, search],
  );
  const move = (from: number, to: number) => {
    const ids = [...value];
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onChange(ids);
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-card-search">Find card versions</Label>
        <Input
          id="group-card-search"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setLimit(24);
          }}
          placeholder="Card name, set, treatment, or variant ID…"
        />
        <p className="text-xs text-muted-foreground">
          Search at least two characters, then select the exact printing. Groups can hold up to 500
          versions.
        </p>
      </div>
      {catalog.isPending && <p role="status">Loading card versions…</p>}
      {catalog.isError && (
        <div role="alert">
          Unable to load card versions.{' '}
          <Button type="button" variant="link" onClick={() => void catalog.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {search.trim().length >= 2 && catalog.isSuccess && (
        <div className="space-y-3 rounded-lg border p-3">
          <p role="status" className="text-sm text-muted-foreground">
            {matches.length} matching versions
          </p>
          <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
            {matches.slice(0, limit).map(({ card, variant }) => (
              <button
                key={variant.variantId}
                type="button"
                disabled={value.includes(variant.variantId) || value.length >= 500}
                onClick={() => onChange([...value, variant.variantId])}
                className="rounded-lg border bg-background p-2 text-left text-xs hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
              >
                <img
                  src={getCardImageUrl(variant.image.front)}
                  alt=""
                  loading="lazy"
                  className="mx-auto h-28 w-full object-contain"
                />
                <span className="mt-2 block font-medium">{card.name}</span>
                <span className="block text-muted-foreground">
                  {variant.set.toUpperCase()} · {variant.cardNo} · {variant.variantName}
                </span>
                <span className="mt-2 flex items-center gap-1 text-primary">
                  <Plus className="size-3" />
                  {value.includes(variant.variantId) ? 'Added' : 'Add version'}
                </span>
              </button>
            ))}
          </div>
          {matches.length > limit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLimit(count => count + 24)}
            >
              Show more matches
            </Button>
          )}
        </div>
      )}
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Add multiple variant IDs</summary>
        <div className="mt-3 space-y-2">
          <Label htmlFor="group-bulk-ids">Variant IDs, separated by commas or new lines</Label>
          <Textarea
            id="group-bulk-ids"
            value={bulk}
            onChange={event => setBulk(event.target.value)}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!catalog.data || !bulk.trim()}
            onClick={() => {
              const ids = [
                ...new Set(
                  bulk
                    .split(/[,\n\r]+/)
                    .map(id => id.trim())
                    .filter(Boolean),
                ),
              ];
              const missing = ids.filter(id => !index.has(id));
              const next = [...new Set([...value, ...ids])];
              if (missing.length) {
                setBulkError(`Unknown versions: ${missing.slice(0, 5).join(', ')}`);
                return;
              }
              if (next.length > 500) {
                setBulkError('A group can contain at most 500 versions.');
                return;
              }
              onChange(next);
              setBulk('');
              setBulkError('');
            }}
          >
            Add versions
          </Button>
          {bulkError && (
            <p role="alert" className="text-sm text-destructive">
              {bulkError}
            </p>
          )}
        </div>
      </details>
      <div className="space-y-2">
        <p className="text-sm font-medium">Selected versions ({value.length})</p>
        {!value.length && (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            Choose the versions you want to showcase. Their order here is their order in the
            gallery.
          </p>
        )}
        <ol className="max-h-[32rem] space-y-2 overflow-y-auto">
          {value.map((id, i) => {
            const printing = index.get(id);
            return (
              <li key={id} className="flex min-w-0 items-center gap-3 rounded-lg border p-2">
                {printing && (
                  <img
                    src={getCardImageUrl(printing.variant.image.front)}
                    alt=""
                    loading="lazy"
                    className="h-16 w-12 shrink-0 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">
                    {printing?.card.name ?? 'Unavailable card version'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {printing &&
                      `${printing.variant.set.toUpperCase()} · ${printing.variant.cardNo} · ${printing.variant.variantName}`}
                  </p>
                  <p className="break-all text-[10px] text-muted-foreground">{id}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSmall"
                    aria-label={`Move version ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSmall"
                    aria-label={`Move version ${i + 1} down`}
                    disabled={i === value.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSmall"
                    aria-label={`Remove version ${i + 1}`}
                    onClick={() => onChange(value.filter(item => item !== id))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
