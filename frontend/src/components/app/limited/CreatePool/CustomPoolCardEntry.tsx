import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { MAX_CUSTOM_CARD_POOL_SIZE } from '../../../../../../shared/types/cardPools.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';
import {
  addCustomPoolDraftEntry,
  groupCustomPoolDraftEntries,
  parseCollectorNumber,
  removeAllCustomPoolDraftEntries,
  removeOneCustomPoolDraftEntry,
  type CustomPoolDraftEntry,
} from './customPoolDraft.ts';

type CustomPoolCardEntryProps = {
  selectedSet: SwuSet;
  entries: CustomPoolDraftEntry[];
  onChange: (action: React.SetStateAction<CustomPoolDraftEntry[]>) => boolean | void;
  disabled?: boolean;
  description?: React.ReactNode;
};

const CustomPoolCardEntry: React.FC<CustomPoolCardEntryProps> = ({
  selectedSet,
  entries,
  onChange,
  disabled = false,
  description,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [collectorNumber, setCollectorNumber] = useState('');
  const [inputError, setInputError] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const { data: cardListData, isFetching, error: cardListError } = useCardList();

  const groups = useMemo(() => groupCustomPoolDraftEntries(entries), [entries]);
  const reachedLimit = entries.length >= MAX_CUSTOM_CARD_POOL_SIZE;
  const inputDisabled = disabled || isFetching || !cardListData || reachedLimit;
  const wasInputDisabled = useRef(inputDisabled);

  useEffect(() => {
    const becameEnabled = wasInputDisabled.current && !inputDisabled;
    wasInputDisabled.current = inputDisabled;

    if (becameEnabled) {
      inputRef.current?.focus();
    }
  }, [inputDisabled]);

  const addCard = (event: React.FormEvent) => {
    event.preventDefault();

    const cardNo = parseCollectorNumber(collectorNumber);
    if (cardNo === undefined) {
      setInputError('Enter a positive collector number.');
      return;
    }

    if (!cardListData) {
      setInputError('The card catalog is not available yet.');
      return;
    }

    if (reachedLimit) {
      setInputError(`A custom pool can contain at most ${MAX_CUSTOM_CARD_POOL_SIZE} cards.`);
      return;
    }

    const match = cardListData.cardsByCardNo[selectedSet]?.[cardNo];
    const card = match ? cardListData.cards[match.cardId] : undefined;
    if (!match || !card) {
      setInputError(`Card #${cardNo} was not found in ${selectedSet.toUpperCase()}.`);
      return;
    }

    const accepted = onChange(current =>
      addCustomPoolDraftEntry(current, { cardId: match.cardId, cardNo }),
    );
    if (accepted === false) return;

    setCollectorNumber('');
    setInputError(undefined);
    setAnnouncement(`${card.name} added. ${entries.length + 1} cards in the pool.`);
    inputRef.current?.focus();
  };

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-2">
        <h5 className="font-medium">Enter your cards</h5>
        <p className="text-xs text-muted-foreground">
          {description ?? (
            <>
              Enter a {selectedSet.toUpperCase()} collector number and press Enter. Enter the same
              number again for another physical copy.
            </>
          )}
        </p>
      </div>

      <form onSubmit={addCard} className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium">
          Collector number
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={collectorNumber}
            onChange={event => {
              setCollectorNumber(event.target.value);
              setInputError(undefined);
            }}
            placeholder="e.g. 42"
            disabled={inputDisabled}
            aria-describedby={inputError ? 'custom-pool-card-error' : undefined}
          />
        </label>
        <Button
          type="submit"
          size="icon"
          disabled={inputDisabled}
          aria-label="Add card to custom pool"
        >
          <Plus />
        </Button>
      </form>

      {isFetching && !cardListData && (
        <p className="mt-2 text-xs text-muted-foreground">Loading the card catalog…</p>
      )}
      {cardListError && !cardListData && (
        <p className="mt-2 text-xs text-destructive">Failed to load the card catalog.</p>
      )}
      {inputError && (
        <p id="custom-pool-card-error" role="alert" className="mt-2 text-xs text-destructive">
          {inputError}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {entries.length} / {MAX_CUSTOM_CARD_POOL_SIZE} cards
        </span>
        {entries.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="xs" disabled={disabled}>
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the custom pool?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all {entries.length} cards you entered. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onChange([])}
                >
                  Clear pool
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No cards added yet.</p>
      ) : (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
          {groups.map(group => {
            const card = cardListData?.cards[group.cardId];
            return (
              <li
                key={group.key}
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  #{String(group.cardNo).padStart(3, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {card?.name ?? group.cardId}
                </span>
                <span className="shrink-0 text-xs font-medium">×{group.quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="iconMedium"
                  onClick={() => onChange(current => removeOneCustomPoolDraftEntry(current, group))}
                  disabled={disabled}
                  aria-label={`Remove one ${card?.name ?? group.cardId}`}
                >
                  <Minus />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="iconMedium"
                  onClick={() =>
                    onChange(current => removeAllCustomPoolDraftEntries(current, group))
                  }
                  disabled={disabled}
                  aria-label={`Remove all ${card?.name ?? group.cardId}`}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomPoolCardEntry;
