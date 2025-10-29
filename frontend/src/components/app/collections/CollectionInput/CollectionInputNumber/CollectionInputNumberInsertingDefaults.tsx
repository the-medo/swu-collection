import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import DefaultFoilSwitch from '@/components/app/collections/CollectionInput/components/DefaultFoilSwitch.tsx';
import DefaultNoteInput from '@/components/app/collections/CollectionInput/components/DefaultNoteInput.tsx';
import DefaultAmountInput from '@/components/app/collections/CollectionInput/components/DefaultAmountInput.tsx';
import DefaultLanguageSelect from '@/components/app/collections/CollectionInput/components/DefaultLanguageSelect.tsx';
import DefaultConditionSelect from '@/components/app/collections/CollectionInput/components/DefaultConditionSelect.tsx';
import {
  useCollectionInputNumberStore,
  useCollectionInputNumberStoreActions,
} from '@/components/app/collections/CollectionInput/CollectionInputNumber/useCollectionInputNumberStore.tsx';

interface CollectionInputNumberInsertingDefaultsProps {}

const CollectionInputNumberInsertingDefaults: React.FC<
  CollectionInputNumberInsertingDefaultsProps
> = ({}) => {
  const { defaultFoil, defaultAmount, defaultNote, defaultLanguage, defaultCondition } =
    useCollectionInputNumberStore();

  const {
    setDefaultFoil,
    setDefaultAmount,
    setDefaultNote,
    setDefaultLanguage,
    setDefaultCondition,
  } = useCollectionInputNumberStoreActions();

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Inserting defaults</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-[auto_1fr_auto] grid-rows-3 gap-4 p-4 pt-0">
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

export default CollectionInputNumberInsertingDefaults;
