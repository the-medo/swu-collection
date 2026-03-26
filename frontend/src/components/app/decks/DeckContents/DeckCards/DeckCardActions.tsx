import * as React from 'react';
import { ClipboardCopy, Link, SquareArrowUpRight } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import DeckCardQuantitySelector from '@/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx';
import { DeckCardDropdownMenuProps } from '@/components/app/decks/DeckContents/DeckCards/DeckCardDropdownMenu.tsx';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '@/hooks/use-toast.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';

type DeckCardActionsDisplay = 'dropdown-menu' | 'card-detail-modal';

interface DeckCardActionsProps extends DeckCardDropdownMenuProps {
  display: DeckCardActionsDisplay;
}

const DeckCardActions: React.FC<DeckCardActionsProps> = ({
  deckCard,
  card,
  editable = false,
  cardInBoards,
  onQuantityChange,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const defaultVariantId = card ? selectDefaultVariant(card) : undefined;
  const imageUrl = getCardImageUrl(card?.variants[defaultVariantId ?? '']?.image.front);

  const handleCopyText = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch (error) {
      console.error('Failed to copy text to clipboard', error);
      toast({
        title: 'Clipboard copy failed',
        description: 'Your browser blocked access to the clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="md:border-r p-2">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            navigate({
              to: '.',
              search: prev => ({ ...prev, modalCardId: deckCard.cardId }),
            });
          }}
        >
          <SquareArrowUpRight />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            void handleCopyText(card?.name || '', 'Card name copied to clipboard');
          }}
        >
          <ClipboardCopy />
          Copy name
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            void handleCopyText(card?.cardId || '', 'Card ID copied to clipboard');
          }}
        >
          <ClipboardCopy />
          Copy card ID
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!imageUrl}
          onSelect={() => {
            void handleCopyText(imageUrl || '', 'Card image URL copied to clipboard');
          }}
        >
          <Link />
          Copy image URL
        </DropdownMenuItem>
      </div>
      <div className="p-2 pl-4">
        {onQuantityChange && (
          <div className="flex flex-col text-sm gap-2 w-[250px]">
            <div className="flex gap-2 justify-between items-center">
              <span className="font-semibold">Maindeck</span>
              <DeckCardQuantitySelector
                value={cardInBoards?.[1]}
                onChange={n => onQuantityChange(n, 1)}
                disabled={!editable}
              />
            </div>
            <div className="flex gap-2 justify-between items-center">
              <span className="font-semibold">Sideboard</span>
              <DeckCardQuantitySelector
                value={cardInBoards?.[2]}
                onChange={n => onQuantityChange(n, 2)}
                disabled={!editable}
              />
            </div>
            <div className="flex gap-2 justify-between items-center">
              <span className="font-semibold">Maybeboard</span>
              <DeckCardQuantitySelector
                value={cardInBoards?.[3]}
                onChange={n => onQuantityChange(n, 3)}
                disabled={!editable}
              />
            </div>
            <DropdownMenuSeparator />
          </div>
        )}
      </div>
    </>
  );
};

export default DeckCardActions;
