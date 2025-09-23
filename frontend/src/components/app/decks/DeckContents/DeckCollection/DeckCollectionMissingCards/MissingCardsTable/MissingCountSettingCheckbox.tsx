import React, { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  DeckMissingCountKey,
  useDeckMissingCardsStore,
  useDeckMissingCardsStoreActions,
} from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';

interface MissingCountSettingCheckboxProps {
  k: DeckMissingCountKey;
}

const MissingCountSettingCheckbox: React.FC<MissingCountSettingCheckboxProps> = ({ k }) => {
  const checked = useDeckMissingCardsStore(k);
  const { setDeckMissingCardsStore } = useDeckMissingCardsStoreActions();

  useEffect(() => {
    console.log(checked);
  }, [checked]);

  return (
    <label className="flex items-center gap-2 px-1 py-1">
      <Checkbox
        checked={checked}
        onCheckedChange={val => {
          // console.log(val);
          setDeckMissingCardsStore(k, Boolean(val));
        }}
      />
    </label>
  );
};

export default MissingCountSettingCheckbox;
