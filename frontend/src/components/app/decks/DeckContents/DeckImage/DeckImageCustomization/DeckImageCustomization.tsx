import * as React from 'react';
import { Accordion } from '@/components/ui/accordion';
import DeckImageCustomizationDefaults from './DeckImageCustomizationDefaults';
import DeckImageCardVariants from './DeckImageCardVariants';

interface DeckImageCustomizationProps {
  deckId: string;
}

const DeckImageCustomization: React.FC<DeckImageCustomizationProps> = ({ deckId }) => {
  return (
    <div className="p-2 space-y-3 text-sm">
      <Accordion type="multiple" className="w-full mt-4">
        <DeckImageCustomizationDefaults />
        <DeckImageCardVariants />
      </Accordion>
      <p className="text-xs text-muted-foreground">Deck: {deckId}</p>
    </div>
  );
};

export default DeckImageCustomization;
