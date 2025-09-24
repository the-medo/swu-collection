import React, { useCallback, useMemo } from 'react';
import type { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import { CardLanguage } from '../../../../../../types/enums.ts';
import {
  useCollectionCardSelectionActions,
  useCollectionSingleCardSelectionStore,
} from '@/components/app/collections/CollectionCardSelection/useCollectionCardSelectionStore.ts';
import { Input } from '@/components/ui/input.tsx';
import { MinusCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface CollectionCardSelectionInputProps {
  collectionId: string;
  card: CollectionCard;
}

// Fallback icons (simple buttons). Replace with actual icon components if needed.
const MinusIcon: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = props => (
  <button
    type="button"
    aria-label="Decrease"
    className={cn({
      'opacity-50 cursor-not-allowed': props.disabled,
    })}
    {...props}
  >
    <MinusCircle className="size-4" />
  </button>
);
const PlusIcon: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = props => (
  <button
    type="button"
    aria-label="Increase"
    className={cn({
      'opacity-50 cursor-not-allowed': props.disabled,
    })}
    {...props}
  >
    <PlusCircle className="size-4" />
  </button>
);

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const CollectionCardSelectionInput: React.FC<CollectionCardSelectionInputProps> = ({
  collectionId,
  card,
}) => {
  const { cardId, variantId, foil, condition, language, amount: maxAmount } = card;

  // Store returns a single matching selection entry or undefined
  const currentSelection = useCollectionSingleCardSelectionStore(
    collectionId,
    cardId,
    variantId,
    foil,
    condition,
    language as CardLanguage,
  ) as unknown as { amount?: number } | undefined;

  const value = useMemo(
    () => clamp(currentSelection?.amount ?? 0, 0, maxAmount ?? 0),
    [currentSelection?.amount, maxAmount],
  );

  const { setSingleCollectionCardSelection } = useCollectionCardSelectionActions(collectionId);

  const commitAmount = useCallback(
    (next: number) => {
      const nextClamped = clamp(next, 0, maxAmount ?? 0);
      // upsertCard in the store adds the provided amount to existing amount.
      // To set absolute value, we pass the delta: desired - current.
      const delta = nextClamped - (currentSelection?.amount ?? 0);
      if (delta === 0) return;
      setSingleCollectionCardSelection({ ...card, amount: delta });
    },
    [card, currentSelection?.amount, maxAmount, setSingleCollectionCardSelection],
  );

  const handleDecrease = useCallback(() => {
    commitAmount(value - 1);
  }, [commitAmount, value]);

  const handleIncrease = useCallback(() => {
    commitAmount(value + 1);
  }, [commitAmount, value]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        // if user clears input, treat as 0
        commitAmount(0);
      } else {
        commitAmount(parsed);
      }
    },
    [commitAmount],
  );

  const min = 0;
  const max = maxAmount ?? 0;
  const disabledDecr = value <= min;
  const disabledIncr = value >= max;

  return (
    <div className="inline-flex items-center gap-1">
      <MinusIcon onClick={handleDecrease} disabled={disabledDecr} />
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={onInputChange}
        className="w-16 h-8 text-center border rounded"
      />
      <PlusIcon onClick={handleIncrease} disabled={disabledIncr} />
    </div>
  );
};

export default CollectionCardSelectionInput;
