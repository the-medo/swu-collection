import { cn } from '@/lib/utils';
import { limitedStyles } from '@/components/app/limited/limitedStyles';
import React from 'react';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCardContentStack from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContentStack.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import CPMultiCardSelectActions from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPMultiCardSelectActions.tsx';

export interface CPDeckAndTrashCardProps {
  deck?: ExpandedCardData[];
  trash?: ExpandedCardData[];
  className?: string;
  poolId?: string;
  deckId?: string;
}

const CPDeckAndTrashCard: React.FC<CPDeckAndTrashCardProps> = ({
  deck,
  trash,
  className,
  poolId,
  deckId,
}) => {
  return (
    <div
      className={cn(limitedStyles.panel, 'min-h-full w-full p-2 text-xs', className)}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Accordion type="single" defaultValue="resulting-deck" collapsible>
        <AccordionItem value="resulting-deck">
          <div className="flex items-center justify-between gap-2">
            <AccordionTrigger className="font-semibold gap-2">
              <span className={limitedStyles.heading}>Final Deck ({deck?.length ?? 0})</span>
            </AccordionTrigger>
            {deck && deck.length > 0 ? (
              <CPMultiCardSelectActions
                cards={deck}
                section="deck"
                poolId={poolId}
                deckId={deckId}
                hideInlineSelectDeselect
              />
            ) : null}
          </div>
          <AccordionContent className="max-h-[calc(100vh-320px)] overflow-y-auto flex justify-center">
            {deck && deck.length > 0 ? (
              <CPCardContentStack
                items={deck}
                size="w200"
                showTitle={false}
                showBadges={false}
                showMultiSelectActions={false}
              />
            ) : (
              <p className="text-xs opacity-80">
                Deck is empty. Select cards in the pool and move them here!
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="trash">
          <div className="flex items-center justify-between gap-2">
            <AccordionTrigger className="font-semibold gap-2">
              <span className={limitedStyles.heading}>Trash ({trash?.length ?? 0})</span>
            </AccordionTrigger>
            {trash && trash.length > 0 ? (
              <CPMultiCardSelectActions
                cards={trash}
                section="trash"
                poolId={poolId}
                deckId={deckId}
                hideInlineSelectDeselect
              />
            ) : null}
          </div>
          <AccordionContent className="max-h-[calc(100vh-320px)] overflow-y-auto rounded-md border p-3 bg-red-50/70 border-red-300 dark:bg-red-950/30 dark:border-red-800 flex justify-center">
            {trash && trash.length > 0 ? (
              <CPCardContentStack
                items={trash}
                size="w200"
                showTitle={false}
                showBadges={false}
                showMultiSelectActions={false}
              />
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
