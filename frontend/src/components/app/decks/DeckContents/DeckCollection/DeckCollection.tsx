import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import DeckCollectionMissingCards from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/DeckCollectionMissingCards.tsx';

interface DeckCollectionProps {
  deckId: string;
}

const DeckCollection: React.FC<DeckCollectionProps> = ({ deckId }) => {
  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="missing-cards">
      <AccordionItem value="missing-cards">
        <AccordionTrigger>
          <h3 className="mb-0">Missing Cards</h3>
        </AccordionTrigger>
        <AccordionContent>
          <DeckCollectionMissingCards deckId={deckId} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="collection-data">
        <AccordionTrigger>
          <h3 className="mb-0">Collection data</h3>
        </AccordionTrigger>
        <AccordionContent></AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default DeckCollection;
