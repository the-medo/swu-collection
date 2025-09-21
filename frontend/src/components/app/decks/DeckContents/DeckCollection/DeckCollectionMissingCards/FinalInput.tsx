import React from 'react';
import { Input } from '@/components/ui/input.tsx';
import {
  useDeckMissingCardsFinalQuantity,
  useDeckMissingCardsStoreActions,
} from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { XCircle } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface FinalInputProps {
  cardId: string;
}

const FinalInput: React.FC<FinalInputProps> = ({ cardId }) => {
  const entry = useDeckMissingCardsFinalQuantity(cardId);
  const { setSingleFinalQuantity, resetSingleCardFinalQuantityState } =
    useDeckMissingCardsStoreActions();

  const value = entry?.quantity ?? 0;
  const original = entry?.originalQuantity ?? 0;
  const changed = entry?.changed ?? false;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const num = Math.max(0, Number(v.replace(/[^0-9]/g, '')) || 0);
    setSingleFinalQuantity(cardId, num);
  };

  const wrapperClasses = `flex items-center justify-end w-full p-1 bg-primary/20 pl-2`;

  return (
    <div className={wrapperClasses}>
      <Input
        type="number"
        className={cn(`w-12 px-2 font-bold rounded-full text-right transition-shadow ring-2 `, {
          'ring-primary': changed,
          'ring-transparent': !changed,
        })}
        maxLength={2}
        value={value}
        onChange={onChange}
        min={0}
      />
      <div className="ml-1 h-4 w-4 flex items-center justify-center">
        {changed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-primary hover:text-primary/80"
                  onClick={() => resetSingleCardFinalQuantityState(cardId)}
                  aria-label={`Reset to original (${original})`}
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Reset to original (originalQuantity: {original})
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  );
};

export default FinalInput;
