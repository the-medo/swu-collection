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
      className={`h-full rounded-lg border border-border bg-card p-3 text-xs opacity-80 ${className ?? ''}`}
    >
      <Accordion type="single" defaultValue="resulting-deck" collapsible>
        <AccordionItem value="resulting-deck">
          <AccordionTrigger className="text-sm font-semibold">Resulting Deck</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap break-words">
              {deck?.map(c => `${c.cardId} (${c.location})`).join('\n') ?? ''}
            </pre>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="trash">
          <AccordionTrigger className="text-sm font-semibold">Trash</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap break-words">
              {trash?.map(c => `${c.cardId} (${c.location})`).join('\n') ?? ''}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CPDeckAndTrashCard;
