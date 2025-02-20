import * as React from 'react';
import {
  useCollectionInputNameStore,
  useCollectionInputNameStoreActions,
} from '@/components/app/collections/CollectionInput/CollectionInputName/useCollectionInputNameStore.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import DefaultVariantNameSelect from '@/components/app/collections/CollectionInput/components/DefaultVariantNameSelect.tsx';
import DefaultFoilSwitch from '@/components/app/collections/CollectionInput/components/DefaultFoilSwitch.tsx';
import DefaultNoteInput from '@/components/app/collections/CollectionInput/components/DefaultNoteInput.tsx';
import DefaultAmountInput from '@/components/app/collections/CollectionInput/components/DefaultAmountInput.tsx';
import DefaultLanguageSelect from '@/components/app/collections/CollectionInput/components/DefaultLanguageSelect.tsx';
import DefaultConditionSelect from '@/components/app/collections/CollectionInput/components/DefaultConditionSelect.tsx';

interface CollectionInputNameInsertingDefaultsProps {}

const CollectionInputNameInsertingDefaults: React.FC<
  CollectionInputNameInsertingDefaultsProps
> = ({}) => {
  const {
    defaultVariantName,
    defaultFoil,
    defaultAmount,
    defaultNote,
    defaultLanguage,
    defaultCondition,
  } = useCollectionInputNameStore();

  const {
    setDefaultVariantName,
    setDefaultFoil,
    setDefaultAmount,
    setDefaultNote,
    setDefaultLanguage,
    setDefaultCondition,
  } = useCollectionInputNameStoreActions();

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Inserting defaults</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-[auto,1fr,auto] grid-rows-3 gap-4 p-4 pt-0">
            <DefaultVariantNameSelect value={defaultVariantName} onChange={setDefaultVariantName} />
            <DefaultFoilSwitch value={defaultFoil} onChange={setDefaultFoil} />
            <DefaultNoteInput value={defaultNote} onChange={setDefaultNote} />
            <DefaultAmountInput value={defaultAmount} onChange={setDefaultAmount} />
            <DefaultLanguageSelect value={defaultLanguage} onChange={setDefaultLanguage} />
            <DefaultConditionSelect value={defaultCondition} onChange={setDefaultCondition} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default CollectionInputNameInsertingDefaults;
