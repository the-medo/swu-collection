import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { ChevronDown, Plus } from 'lucide-react';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { usePostCollectionCard } from '@/api/collections/usePostCollectionCard.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/utils.ts';
import { CardLanguage } from '../../../../../../types/enums.ts';
import { getFoilBasedOnVariantAndSet } from '../CollectionInput/collectionInputLib.ts';

function CardNumberSearch({
  onSelectCard,
  disabled,
  set,
  setSet,
}: {
  onSelectCard: (cardId: string, variantId: string) => void;
  disabled: boolean;
  set: string;
  setSet: (set: string) => void;
}) {
  const catalog = useCardList();
  const [number, setNumber] = useState('');
  const printings = useMemo(
    () =>
      Object.values(catalog.data?.cards ?? {}).flatMap(card =>
        !card || card.type.includes('Token')
          ? []
          : Object.values(card.variants).flatMap(variant => (variant ? [{ card, variant }] : [])),
      ),
    [catalog.data],
  );
  const sets = useMemo(
    () => [...new Set(printings.map(({ variant }) => variant.set))].sort(),
    [printings],
  );
  const matches = printings.filter(
    ({ variant }) => variant.set === set && number !== '' && variant.cardNo === Number(number),
  );
  const lookup = (nextSet: string, nextNumber: string) => {
    setSet(nextSet);
    setNumber(nextNumber);
    const candidates = printings.filter(
      ({ variant }) =>
        variant.set === nextSet && nextNumber !== '' && variant.cardNo === Number(nextNumber),
    );
    // A printed number can identify more than one card or treatment. Ask the
    // user to pick instead of silently choosing one of those printings.
    onSelectCard(
      candidates.length === 1 ? candidates[0].card.cardId : '',
      candidates.length === 1 ? candidates[0].variant.variantId : '',
    );
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <select
          aria-label="Card set"
          disabled={disabled}
          value={set}
          onChange={event => lookup(event.target.value, number)}
          className="h-9 w-24 rounded-md border bg-background px-2 text-xs"
        >
          {sets.map(code => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
        <Input
          aria-label="Card number"
          placeholder="Card number"
          type="number"
          min={1}
          step={1}
          disabled={disabled}
          value={number}
          onChange={event => lookup(set, event.target.value)}
          className="h-9 min-w-0 flex-1"
        />
      </div>
      {number && matches.length === 0 && (
        <p className="text-xs text-muted-foreground">No printing found. Try searching by name.</p>
      )}
      {matches.length > 1 && (
        <select
          aria-label="Choose matching card"
          disabled={disabled}
          defaultValue=""
          key={`${set}:${number}`}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          onChange={event => {
            const match = matches[Number(event.target.value)];
            if (match) onSelectCard(match.card.cardId, match.variant.variantId);
          }}
        >
          <option value="" disabled>
            Choose one of {matches.length} matches
          </option>
          {matches.map(({ card, variant }, i) => (
            <option key={`${card.cardId}:${variant.variantId}`} value={i}>
              {card.name} · {variant.variantName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function FloatingCardImport({
  collectionId,
  title,
}: {
  collectionId: string;
  title: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [searchMode, setSearchMode] = useState<'name' | 'number'>('name');
  const [numberSearchKey, setNumberSearchKey] = useState(0);
  const [numberSet, setNumberSet] = useState('sor');
  const catalog = useCardList();
  const mutation = usePostCollectionCard(collectionId);
  const form = useForm({
    defaultValues: { cardId: '', variantId: '', count: 1, foil: false },
    onSubmit: async ({ value }) => {
      if (mutation.isPending || !catalog.data?.cards[value.cardId]?.variants[value.variantId])
        return;
      try {
        await mutation.mutateAsync({
          cardId: value.cardId,
          variantId: value.variantId,
          amount: value.count,
          foil: value.foil,
          condition: 1,
          language: CardLanguage.EN,
        });
        form.reset();
        setNumberSearchKey(key => key + 1);
      } catch {
        /* Keep the selection; the mutation displays the error. */
      }
    },
  });
  return (
    <aside
      aria-label="Add cards while reviewing"
      className="sticky top-2 z-20 rounded-xl border border-primary/25 bg-background/95 p-3 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0! flex items-center gap-2 border-0! p-0! text-sm! font-semibold!">
            <Plus className="size-4" /> Add cards while reviewing
          </h2>
          {expanded && (
            <p className="truncate text-xs text-muted-foreground">{title} · Near Mint · English</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={expanded}
          aria-controls="review-card-import"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
          <ChevronDown className={cn('size-4', expanded && 'rotate-180')} />
        </Button>
      </div>
      <div id="review-card-import" hidden={!expanded}>
        <form
          className="mt-3"
          onSubmit={event => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <fieldset disabled={mutation.isPending} className="space-y-2">
            <form.Subscribe selector={state => state.values}>
              {values => {
                const card = catalog.data?.cards[values.cardId];
                const variant = card?.variants[values.variantId];
                const selectVariant = (variantId: string, cardId = values.cardId) => {
                  const selectedCard = catalog.data?.cards[cardId];
                  const selected = selectedCard?.variants[variantId];
                  form.setFieldValue('cardId', cardId);
                  form.setFieldValue('variantId', variantId);
                  form.setFieldValue(
                    'foil',
                    selected
                      ? getFoilBasedOnVariantAndSet(selected, false, selectedCard?.variants)
                      : false,
                  );
                };
                return (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-48 flex-1">
                      <div className="mb-1 flex gap-1" role="group" aria-label="Search cards by">
                        {(['name', 'number'] as const).map(mode => (
                          <Button
                            key={mode}
                            type="button"
                            size="sm"
                            variant={mode === searchMode ? 'secondary' : 'ghost'}
                            className="h-6 px-2 text-xs"
                            aria-pressed={mode === searchMode}
                            disabled={mutation.isPending}
                            onClick={() => {
                              setSearchMode(mode);
                              selectVariant('', '');
                            }}
                          >
                            {mode === 'name' ? 'Name' : 'Card number'}
                          </Button>
                        ))}
                      </div>
                      {searchMode === 'name' ? (
                        <CardSearchCommand
                          id={`import-review-search-${collectionId}`}
                          label="Find a card to add"
                          disabled={mutation.isPending}
                          onSelectCard={(cardId, variantId) => selectVariant(variantId, cardId)}
                        />
                      ) : (
                        <CardNumberSearch
                          key={numberSearchKey}
                          set={numberSet}
                          setSet={setNumberSet}
                          disabled={mutation.isPending}
                          onSelectCard={(cardId, variantId) => selectVariant(variantId, cardId)}
                        />
                      )}
                    </div>
                    {card && (
                      <div className="flex min-w-0 flex-[2] items-center gap-2">
                        {variant?.image.front && (
                          <div className="w-8 shrink-0">
                            <CardImage
                              card={card}
                              cardVariantId={variant.variantId}
                              size="responsive"
                              backSideButton={false}
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-xs font-medium">{card.name}</p>
                          <select
                            aria-label="Printing to add"
                            className="h-8 w-full min-w-0 rounded-md border bg-background px-2 text-xs"
                            value={values.variantId}
                            onChange={event => selectVariant(event.target.value)}
                          >
                            {Object.values(card.variants)
                              .filter(v => !!v)
                              .map(v => (
                                <option key={v.variantId} value={v.variantId}>
                                  {v.set.toUpperCase()} #{v.cardNo} · {v.variantName}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}
                    <div className="w-20 space-y-1">
                      <Label htmlFor="review-add-count" className="text-xs">
                        Quantity
                      </Label>
                      <Input
                        id="review-add-count"
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        required
                        className="h-8"
                        value={values.count}
                        onChange={event => form.setFieldValue('count', Number(event.target.value))}
                      />
                    </div>
                    <label className="flex h-8 items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={values.foil}
                        onChange={event => form.setFieldValue('foil', event.target.checked)}
                      />{' '}
                      Foil
                    </label>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        mutation.isPending ||
                        !variant ||
                        !Number.isInteger(values.count) ||
                        values.count < 1 ||
                        values.count > 1000
                      }
                    >
                      <Plus className="size-3.5" />
                      {mutation.isPending ? 'Adding…' : 'Add card'}
                    </Button>
                  </div>
                );
              }}
            </form.Subscribe>
          </fieldset>
        </form>
      </div>
    </aside>
  );
}
