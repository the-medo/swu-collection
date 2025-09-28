import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import DeckCollectionMissingCards from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/DeckCollectionMissingCards.tsx';
import { CircleHelp } from 'lucide-react';

interface DeckCollectionProps {
  deckId: string;
}

const DeckCollection: React.FC<DeckCollectionProps> = ({ deckId }) => {
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <Accordion type="single" collapsible={false} className="w-full" defaultValue="missing-cards">
      <AccordionItem value="missing-cards">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <h3 className="mb-0">Missing Cards</h3>
            <button
              type="button"
              aria-label="How Missing Cards work"
              className="inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setShowHelp(v => !v);
              }}
            >
              <CircleHelp className="size-4 text-muted-foreground" />
            </button>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {showHelp ? (
            <div className="mb-3 rounded-md border bg-muted/20 p-3 text-sm">
              <div className="font-medium mb-1">How "Missing Cards" works</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Qty is taken from the deck list (how many copies the deck wants in maindeck +
                  sideboard).
                </li>
                <li>
                  The final amount is computed from this qty, which is being reduced by the amount
                  of cards you already have in the selected sources: collections (for decks), other
                  collections, wantlists, and cardlists (only checked ones are counted).
                </li>
                <li>By default, only collections (for decks) are selected.</li>
                <li>
                  The final amount can be overwritten manually; when you edit it, the value becomes
                  fixed and will not auto-update until you reset it with the X icon.
                </li>
                <li>
                  When you finish, choose which list to apply your changes to (or create a new list
                  if needed).
                </li>
              </ul>
            </div>
          ) : null}
          <DeckCollectionMissingCards deckId={deckId} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default DeckCollection;
