import React, { useMemo, useRef } from 'react';
import type { CardPoolWithDeckState } from '@/api/card-pools/useGetCardPool.ts';
import { useGetCardPoolCards } from '@/api/card-pools/useGetCardPoolCards.ts';
import { usePutCardPoolCards } from '@/api/card-pools/usePutCardPoolCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { SwuSet } from '../../../../../../types/enums.ts';
import CustomPoolCardEntry from '../CreatePool/CustomPoolCardEntry.tsx';
import {
  resolveCustomPoolDraftEntries,
  type CustomPoolDraftEntry,
} from '../CreatePool/customPoolDraft.ts';

type EditCustomPoolCardsSectionProps = {
  pool: CardPoolWithDeckState;
};

type EditCustomPoolCardsFormProps = {
  pool: CardPoolWithDeckState;
  selectedSet: SwuSet;
  entries: CustomPoolDraftEntry[];
};

const EditCustomPoolCardsForm: React.FC<EditCustomPoolCardsFormProps> = ({
  pool,
  selectedSet,
  entries,
}) => {
  const mutationInFlight = useRef(false);
  const updateMutation = usePutCardPoolCards(pool.id);

  const updateEntries = (action: React.SetStateAction<CustomPoolDraftEntry[]>) => {
    if (pool.hasDecks || mutationInFlight.current) return false;

    const nextEntries = typeof action === 'function' ? action(entries) : action;
    mutationInFlight.current = true;
    updateMutation.mutate(
      { cards: nextEntries.map(entry => entry.cardId) },
      {
        onSettled: () => {
          mutationInFlight.current = false;
        },
      },
    );
    return true;
  };

  return (
    <div className="mb-3 flex flex-col gap-2">
      <CustomPoolCardEntry
        selectedSet={selectedSet}
        entries={entries}
        onChange={updateEntries}
        disabled={pool.hasDecks || updateMutation.isPending}
      />

      {updateMutation.isPending && (
        <div className="text-xs text-muted-foreground">Saving changes…</div>
      )}
      {updateMutation.isError && (
        <div className="text-xs text-destructive">{updateMutation.error.message}</div>
      )}
      {!pool.hasDecks && !updateMutation.isPending && !updateMutation.isError && (
        <div className="text-xs text-muted-foreground">Changes are saved automatically.</div>
      )}
    </div>
  );
};

const EditCustomPoolCardsSection: React.FC<EditCustomPoolCardsSectionProps> = ({ pool }) => {
  const {
    data: mapping,
    isFetching: isFetchingPoolCards,
    error: poolCardsError,
  } = useGetCardPoolCards(pool.id);
  const {
    data: cardListData,
    isFetching: isFetchingCardList,
    error: cardListError,
  } = useCardList();

  const selectedSet = Object.values(SwuSet).includes(pool.set as SwuSet)
    ? (pool.set as SwuSet)
    : undefined;
  const persistedCardIds = useMemo(
    () =>
      Object.entries(mapping ?? {})
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, cardId]) => cardId),
    [mapping],
  );
  const cardsByNumber = selectedSet ? cardListData?.cardsByCardNo[selectedSet] : undefined;
  const resolution = useMemo(
    () => resolveCustomPoolDraftEntries(persistedCardIds, cardsByNumber),
    [cardsByNumber, persistedCardIds],
  );

  if (!selectedSet) {
    return <div className="text-xs text-destructive">This pool does not have a valid set.</div>;
  }

  const isLoading = (!mapping && isFetchingPoolCards) || (!cardListData && isFetchingCardList);
  const hasLoadError = Boolean(poolCardsError || cardListError);
  const hasUnresolvedCards = resolution.unresolvedCardIds.length > 0;

  if (isLoading) {
    return <div className="mb-3 text-xs text-muted-foreground">Loading pool cards…</div>;
  }
  if (hasLoadError || !mapping || !cardsByNumber) {
    return (
      <div className="mb-3 text-xs text-destructive">Failed to load the custom pool editor.</div>
    );
  }
  if (hasUnresolvedCards) {
    return (
      <div className="mb-3 text-xs text-destructive">
        Some cards could not be matched to collector numbers in this set. Reload the card catalog
        before editing this pool.
      </div>
    );
  }

  return (
    <EditCustomPoolCardsForm pool={pool} selectedSet={selectedSet} entries={resolution.entries} />
  );
};

export default EditCustomPoolCardsSection;
