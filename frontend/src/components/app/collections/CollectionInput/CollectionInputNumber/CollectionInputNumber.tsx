import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Button } from '@/components/ui/button.tsx';
import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import AmountInput from '@/components/app/collections/CollectionInput/components/AmountInput.tsx';
import FoilSwitch from '@/components/app/collections/CollectionInput/components/FoilSwitch.tsx';
import { cn } from '@/lib/utils.ts';
import CardLanguageSelect from '@/components/app/global/CardLanguageSelect.tsx';
import CardConditionSelect from '@/components/app/global/CardConditionSelect.tsx';
import NoteInput from '@/components/app/collections/CollectionInput/components/NoteInput.tsx';
import { useCallback, useRef } from 'react';
import { usePostCollectionCard } from '@/api/collections/usePostCollectionCard.ts';
import { cardConditionArray } from '../../../../../../../types/iterableEnumInfo.ts';
import {
  useCollectionInputNumberStore,
  useCollectionInputNumberStoreActions,
} from '@/components/app/collections/CollectionInput/CollectionInputNumber/useCollectionInputNumberStore.tsx';
import { Input } from '@/components/ui/input.tsx';
import CollectionInputNumberInsertingDefaults from '@/components/app/collections/CollectionInput/CollectionInputNumber/CollectionInputNumberInsertingDefaults.tsx';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import CollectionDuplicates from '@/components/app/collections/CollectionInput/CollectionDuplicates/CollectionDuplicates.tsx';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionInputNumberProps {
  collectionId: string;
}

const CollectionInputNumber: React.FC<CollectionInputNumberProps> = ({ collectionId }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const mutation = usePostCollectionCard(collectionId);
  const { collectionOrWantlist } = useCollectionInfo(collectionId);

  const {
    search,
    set,
    selectedVariantId,
    selectedCardId,
    isFetching,
    card: { card, variant },
    amount,
    note,
    foil,
    language,
    condition,
    setCardByNumber,
  } = useCollectionInputNumberStore();

  const {
    setSearch,
    setSet,
    setLanguage,
    setCondition,
    setAmount,
    setNote,
    setFoil,
    resetStateWithDefaults,
  } = useCollectionInputNumberStoreActions();

  const submitHandler = useCallback(async () => {
    try {
      if (selectedCardId && selectedVariantId && amount) {
        await mutation.mutateAsync({
          cardId: selectedCardId,
          variantId: selectedVariantId,
          foil,
          condition: cardConditionArray.find(c => c.condition === condition)?.numericValue ?? 1,
          language,
          amount,
          note,
        });
        resetStateWithDefaults();
        searchInputRef.current?.focus();
      }
      // Optionally clear the form or show a success message.
    } catch (error) {
      // Handle errors here.
      console.error(error);
    }
  }, [selectedCardId, selectedVariantId, foil, condition, language, amount, note]);

  const canSubmit = !!selectedCardId && !!selectedVariantId && amount !== undefined && amount > 0;

  return (
    <div className="flex flex-col gap-2">
      <CollectionInputNumberInsertingDefaults />
      <SetSelect value={set} emptyOption={false} onChange={setSet} showFullName />
      {isFetching ? (
        <Skeleton className={`h-11 w-[350px]`} />
      ) : (
        <Input
          placeholder="Card No."
          type="number"
          value={search}
          onChange={e => {
            const n = Number(e.target.value);
            setSearch(n.toString());
            setCardByNumber(n);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (selectedCardId && selectedVariantId && amount) {
                addButtonRef.current?.focus();
              } else {
                amountInputRef.current?.focus();
              }
            }
          }}
          ref={searchInputRef}
        />
      )}

      <div className="flex flex-col gap-2">
        {variant && (
          <div className="flex gap-2 justify-between">
            <div>
              <span>Variant:</span> <span className="font-bold">{variant?.variantName}</span>
            </div>
            <div>
              <span>Set:</span> <span className="font-bold">{variant?.set.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      <div className={cn('flex gap-4')}>
        <div className="h-[279px] w-[200px] min-h-[279px] min-w-[200px] flex items-center justify-center">
          <CardImage card={card} cardVariantId={variant?.variantId} foil={foil} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <CardLanguageSelect
              value={language}
              onChange={setLanguage}
              showFullName={false}
              emptyOption={false}
            />
            <CardConditionSelect
              value={condition}
              onChange={setCondition}
              showFullName={false}
              emptyOption={false}
            />
          </div>
          <FoilSwitch value={foil} onChange={setFoil} />
          <NoteInput value={note} onChange={setNote} />
          <AmountInput value={amount} onChange={setAmount} ref={amountInputRef} />
        </div>
      </div>

      <Button
        ref={addButtonRef}
        className={cn('w-full focus:border-2 focus:border-black', {
          'opacity-50': !canSubmit, //because disabled button can't be focused ans we want to focus it right after card selection if we have default variant selection
        })}
        disabled={mutation.isPending}
        onClick={canSubmit ? submitHandler : undefined}
      >
        {mutation.isPending ? '...' : `Add to ${collectionOrWantlist.toLowerCase()}`}
      </Button>
      <CollectionDuplicates
        collectionId={collectionId}
        selectedCardId={selectedCardId}
        selectedVariantId={selectedVariantId}
        foil={foil}
        condition={condition}
        language={language}
      />
    </div>
  );
};

export default CollectionInputNumber;
