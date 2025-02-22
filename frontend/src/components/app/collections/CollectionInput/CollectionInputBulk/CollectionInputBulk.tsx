import CardLanguageSelect from '@/components/app/global/CardLanguageSelect.tsx';
import CardConditionSelect from '@/components/app/global/CardConditionSelect.tsx';
import NoteInput from '@/components/app/collections/CollectionInput/components/NoteInput.tsx';
import AmountInput from '@/components/app/collections/CollectionInput/components/AmountInput.tsx';
import * as React from 'react';
import {
  useCollectionInputBulkStore,
  useCollectionInputBulkStoreActions,
} from '@/components/app/collections/CollectionInput/CollectionInputBulk/useCollectionInputBulkStore.tsx';
import SetMultiSelect from '@/components/app/global/SetMultiSelect.tsx';
import RarityMultiSelect from '@/components/app/global/RarityMultiSelect.tsx';
import { MultiSelect } from '@/components/ui/multi-select.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { usePostCollectionCard } from '@/api/usePostCollectionCard.ts';
import { useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Label } from '@/components/ui/label.tsx';

const variantOptions = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Standard FOIL', label: 'Standard FOIL' },
  { value: 'Hyperspace', label: 'Hyperspace' },
  { value: 'Hyperspace FOIL', label: 'Hyperspace FOIL' },
];

interface CollectionInputBulkProps {
  collectionId: string | undefined;
}

const CollectionInputBulk: React.FC<CollectionInputBulkProps> = ({ collectionId }) => {
  const { areYouSure, amount, note, language, condition, sets, rarities, variants } =
    useCollectionInputBulkStore();
  const {
    setAreYouSure,
    setAmount,
    setNote,
    setLanguage,
    setCondition,
    setSets,
    setRarities,
    setVariants,
  } = useCollectionInputBulkStoreActions();

  const mutation = usePostCollectionCard(collectionId);
  const canSubmit =
    areYouSure && amount !== 0 && variants.length > 0 && sets.length > 0 && rarities.length > 0;

  const submitHandler = useCallback(() => {
    console.log('submitHandler');
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <SetMultiSelect defaultValue={[]} onChange={setSets} showFullName={true} />
      <RarityMultiSelect defaultValue={[]} onChange={setRarities} />
      <MultiSelect
        options={variantOptions}
        onValueChange={setVariants}
        defaultValue={variants}
        placeholder="Select variants"
        variant="inverted"
        maxCount={3}
      />
      <div className="flex gap-2">
        <CardLanguageSelect
          value={language}
          onChange={setLanguage}
          showFullName={true}
          emptyOption={false}
        />
        <CardConditionSelect
          value={condition}
          onChange={setCondition}
          showFullName={true}
          emptyOption={false}
        />
      </div>
      <div className="flex gap-2 items-center">
        <NoteInput value={note} onChange={setNote} />
      </div>
      <div className="flex flex-col gap-4">
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4 text-yellow-500 stroke-yellow-500" />
          <AlertTitle className="text-sm">
            Here you can add A LOT of cards at once.{' '}
            <span>Carefully choose sets, rarities and variants you want to add!</span>
          </AlertTitle>
          <AlertDescription className="pt-4">
            <div className="flex gap-4 items-center">
              <Checkbox id="areYouSure" checked={areYouSure} onCheckedChange={setAreYouSure} />
              <Label htmlFor="areYouSure" className="font-bold text-lg">
                I am sure!
              </Label>
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 items-center">
          <AmountInput value={amount} minValue={-3} maxValue={3} onChange={setAmount} />
          <span className="text-sm italic">(max. 3)</span>
        </div>
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={canSubmit ? submitHandler : undefined}
        >
          {mutation.isPending ? '...' : 'Add to collection'}
        </Button>
      </div>
    </div>
  );
};

export default CollectionInputBulk;
