import * as React from 'react';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import AddToComparerButton from '@/components/app/comparer/SidebarComparer/AddToComparerButton.tsx';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';

interface ComparerButtonProps {
  deckId: string;
  additionalData: ComparerEntryAdditionalData;
  compact?: boolean;
}

const ComparerButton: React.FC<ComparerButtonProps> = ({ deckId, additionalData, compact }) => {
  return (
    <NavigationMenuItem>
      <AddToComparerButton
        id={deckId}
        dataType="deck"
        additionalData={additionalData}
        size={compact ? 'icon' : 'default'}
        compact={compact}
      />
    </NavigationMenuItem>
  );
};

export default ComparerButton;
