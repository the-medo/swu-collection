import * as React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';

interface DeckImageCardVariantsProps {
  deckCardVariants: DeckCardVariantMap | undefined;
  setDeckCardVariants: React.Dispatch<React.SetStateAction<DeckCardVariantMap | undefined>>;
}

const DeckImageCardVariants: React.FC<DeckImageCardVariantsProps> = ({
  deckCardVariants,
  setDeckCardVariants,
}) => {
  return (
    <AccordionItem value="card-variants">
      <AccordionTrigger right className="font-semibold">
        Deck image card variants
      </AccordionTrigger>
      <AccordionContent>
        <pre className="text-sm text-muted-foreground overflow-auto">
          {JSON.stringify(deckCardVariants, null, 2)}
        </pre>
      </AccordionContent>
    </AccordionItem>
  );
};

export default DeckImageCardVariants;
