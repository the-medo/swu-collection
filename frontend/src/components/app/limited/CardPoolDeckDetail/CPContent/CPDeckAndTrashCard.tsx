import React from 'react';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';

export interface CPDeckAndTrashCardProps {
  deck?: ExpandedCardData[];
  trash?: ExpandedCardData[];
  className?: string;
}

const CPDeckAndTrashCard: React.FC<CPDeckAndTrashCardProps> = ({ deck, trash, className }) => {
  return (
    <div
      className={`h-full w-[300px] rounded-lg border border-border bg-card p-3 text-xs opacity-80 ${className ?? ''}`}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Accordion type="single" defaultValue="resulting-deck" collapsible>
        <AccordionItem value="resulting-deck">
          <AccordionTrigger className="font-semibold">
            <h4 className="text-base md:text-lg">Final Deck ({deck?.length ?? 0})</h4>
          </AccordionTrigger>
          <AccordionContent>
            {deck && deck.length > 0 ? (
              <pre className="text-xs whitespace-pre-wrap break-words">
                {deck.map(c => `${c.cardId} (${c.location})`).join('\n')}
              </pre>
            ) : (
              <p className="text-xs opacity-80">
                Deck is empty. Select cards in the pool and move them here!
              </p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Trash card pinned to bottom */}
        <AccordionItem value="trash">
          <AccordionTrigger className="font-semibold">
            <h4 className="text-base md:text-lg">Trash ({trash?.length ?? 0})</h4>
          </AccordionTrigger>
          <AccordionContent className="mt-auto rounded-md border p-3 bg-red-50/70 border-red-300 dark:bg-red-950/30 dark:border-red-800">
            {trash && trash.length > 0 ? (
              <pre className="text-xs whitespace-pre-wrap break-words">
                {trash?.map(c => `${c.cardId} (${c.location})`).join('\n') ?? ''}
              </pre>
            ) : (
              <p className="text-xs opacity-80">Trash is empty.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CPDeckAndTrashCard;
