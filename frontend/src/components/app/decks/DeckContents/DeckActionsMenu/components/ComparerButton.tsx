import * as React from 'react';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import AddToComparerButton from '@/components/app/comparer/SidebarComparer/AddToComparerButton.tsx';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';

interface ComparerButtonProps {
  deckId: string;
  additionalData: ComparerEntryAdditionalData;
}

const ComparerButton: React.FC<ComparerButtonProps> = ({ deckId, additionalData }) => {
  return (
    <NavigationMenuItem>
      <AddToComparerButton
        id={deckId}
        dataType="deck"
        additionalData={additionalData}
        size="default"
      />
    </NavigationMenuItem>
  );
};

export default ComparerButton;